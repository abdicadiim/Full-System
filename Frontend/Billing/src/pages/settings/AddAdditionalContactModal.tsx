import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";
import { getToken, API_BASE_URL } from "../../services/auth";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AddAdditionalContactModalProps {
  onClose: () => void;
  onSave: (data: {
    name: string;
    email: string;
    isPrimary?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    smtpSecure?: boolean;
  }) => void;
  editData?: any | null;
}

export default function AddAdditionalContactModal({
  onClose,
  onSave,
  editData = null
}: AddAdditionalContactModalProps) {
  const [name, setName] = useState(editData?.name || "");
  const [email, setEmail] = useState(editData?.email || "");
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [emailSearch, setEmailSearch] = useState(editData?.email || "");

  // SMTP settings
  const [smtpHost, setSmtpHost] = useState(editData?.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(editData?.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(editData?.smtpUser || "");
  const [smtpPassword, setSmtpPassword] = useState(editData?.smtpPassword || "");
  const [smtpSecure, setSmtpSecure] = useState(editData?.smtpSecure || false);

  const [organizationUsers, setOrganizationUsers] = useState<User[]>([]);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/settings/users?status=active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setOrganizationUsers(data.data);
        }
      } catch (error) {
        console.error("Error fetching organization users:", error);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = organizationUsers.filter(user =>
    user.name.toLowerCase().includes(emailSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(emailSearch.toLowerCase())
  );

  const handleSelectUser = (user: User) => {
    setEmail(user.email);
    setEmailSearch(user.email);
    setShowEmailDropdown(false);
  };

  const handleSave = () => {
    if (name && email) {
      onSave({
        name,
        email,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        smtpSecure
      });
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editData ? "Edit Contact" : "Add Additional Contact"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter name"
            />
          </div>

          {/* Email Field */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={emailSearch}
                onChange={(e) => {
                  setEmailSearch(e.target.value);
                  setEmail(e.target.value);
                  setShowEmailDropdown(true);
                }}
                onFocus={() => setShowEmailDropdown(true)}
                className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select from organization users or type"
              />
              <button
                type="button"
                onClick={() => setShowEmailDropdown(!showEmailDropdown)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown size={16} className="text-gray-600" />
              </button>
            </div>
            {showEmailDropdown && filteredUsers.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredUsers.map((user, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SMTP Configuration (Optional) */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Custom SMTP Configuration <span className="text-xs font-normal text-gray-500">(Optional)</span>
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="e.g. smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 587"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SMTP User</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="Email or Username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="App Password"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="smtpSecure" className="text-xs font-medium text-gray-600">Use SSL/TLS (Port 465)</label>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-gray-500 bg-gray-50 p-2 rounded italic">
              Leave these fields empty to use the system default notification server.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

