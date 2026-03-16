import React, { useState } from "react";
import { Edit, Copy, Check, ExternalLink } from "lucide-react";

export default function VendorPortalPage() {
  const [portalName, setPortalName] = useState("tabanenterprises");
  const [isEditingName, setIsEditingName] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [notifyActivity, setNotifyActivity] = useState(true);
  const [notifyVendor, setNotifyVendor] = useState(true);
  const [allowUpdateContact, setAllowUpdateContact] = useState(false);
  const [allowUploadDocuments, setAllowUploadDocuments] = useState(false);
  const [allowAcceptRejectPO, setAllowAcceptRejectPO] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const portalUrl = `https://books.zohosecure.com/portal/${portalName}`;

  const handleEdit = () => {
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    // Here you would typically save to backend
    console.log("Portal name saved:", portalName);
  };

  const handleSaveAll = () => {
    // Save all settings
    const settings = {
      portalName,
      bannerMessage,
      notifyActivity,
      notifyVendor,
      allowUpdateContact,
      allowUploadDocuments,
      allowAcceptRejectPO
    };
    console.log("All settings saved:", settings);
    
    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Vendor Portal</h1>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <Check size={16} className="text-white" />
          </div>
          <p className="text-sm text-green-900">Portal details has been updated</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Portal Name and URL */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[120px]">
              Portal Name :
            </label>
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={portalName}
                  onChange={(e) => setPortalName(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveName}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-gray-900">{portalName}</span>
                <button
                  onClick={handleEdit}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[120px]">
              Portal URL :
            </label>
            <div className="flex items-center gap-2 flex-1">
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                {portalUrl}
                <ExternalLink size={14} />
              </a>
              <button
                onClick={handleCopy}
                className="text-sm text-blue-600 hover:text-blue-700"
                title="Copy URL"
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <Check size={14} className="text-green-600" />
                    Copied
                  </span>
                ) : (
                  "Copy"
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Note: The portal name and portal url will be common for the Customer and Vendor Portal.
          </p>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">?</span>
            </div>
            <a
              href="#"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              Understand how the vendor portal works
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Banner Message */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Banner Message
            </label>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Preview
            </button>
          </div>
          <textarea
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Enter banner message"
          />
          <p className="mt-1 text-xs text-gray-500">
            This message will be displayed right on top of the 'Home' page of the portal.
          </p>
        </div>

        {/* Notification Settings */}
        <div className="space-y-6">
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyActivity}
                onChange={(e) => setNotifyActivity(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Notify me for every activity that takes place in the portal
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  An email and an in-app notification will be sent to you whenever your vendor adds comments, 
                  updates custom fields or uploads documents.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyVendor}
                onChange={(e) => setNotifyVendor(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Notify my vendor when I comment or reject the documents
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  An email notification will be sent to your vendor whenever you add a comment or reject 
                  the documents they uploaded.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Permission Settings */}
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowUpdateContact}
                onChange={(e) => setAllowUpdateContact(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow vendors to update their contact details in the portal
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Vendors can add or edit their shipping/billing addresses, custom fields and other contact details.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowUploadDocuments}
                onChange={(e) => setAllowUploadDocuments(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow vendors to upload documents
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Vendors can upload invoices that support your purchases. Once uploaded, you can verify 
                  and convert them into bills in Zoho Books.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAcceptRejectPO}
                onChange={(e) => setAllowAcceptRejectPO(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow vendors to accept/reject purchase orders
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  The purchase orders you create and send will be available in the portal. The vendor can 
                  review the orders and accept or reject them.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Save and Cancel Buttons */}
        <div className="pt-4 flex items-center gap-3">
          <button
            onClick={handleSaveAll}
            className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Save
          </button>
          <button className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

