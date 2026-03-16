import React, { useState } from "react";
import { Edit, Copy, Check, ExternalLink, X, Monitor } from "lucide-react";
import { createPortal } from "react-dom";

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState("customer-portal");
  const [showNewCustomTabModal, setShowNewCustomTabModal] = useState(false);
  const [showNewCustomModuleModal, setShowNewCustomModuleModal] = useState(false);
  const [portalName, setPortalName] = useState("tabanenterprises");
  const [isEditingName, setIsEditingName] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [customTabs, setCustomTabs] = useState([]);
  const [customModules, setCustomModules] = useState([]);
  const [enableMFA, setEnableMFA] = useState(false);
  const [preventDuplicatePayments, setPreventDuplicatePayments] = useState(false);
  const [allowSignUp, setAllowSignUp] = useState(true);
  const [notifyActivity, setNotifyActivity] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [emailOnComment, setEmailOnComment] = useState(true);
  const [allowUploadEdit, setAllowUploadEdit] = useState(true);
  const [allowForward, setAllowForward] = useState(true);
  const [bulkPayments, setBulkPayments] = useState(true);
  const [enableReviews, setEnableReviews] = useState(false);
  const [viewSalesOrders, setViewSalesOrders] = useState(false);
  const [displayCreditNotes, setDisplayCreditNotes] = useState(false);
  const [viewProjects, setViewProjects] = useState(false);
  const [enableIdentityVerification, setEnableIdentityVerification] = useState(true);
  const [viewSubscriptions, setViewSubscriptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const portalUrl = `https://books.zohosecure.com/portal/${portalName}`;

  const handleEdit = () => {
    setIsEditingName(true);
  };

  const handleSave = () => {
    setIsEditingName(false);
    // Here you would typically save to backend
    console.log("Portal name saved:", portalName);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Customer Portal</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("customer-portal")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "customer-portal"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Customer Portal
        </button>
        <button
          onClick={() => setActiveTab("custom-tabs")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "custom-tabs"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Custom Tabs
        </button>
        <button
          onClick={() => setActiveTab("custom-modules")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "custom-modules"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Custom Modules
        </button>
      </div>

      {/* Custom Tabs Tab */}
      {activeTab === "custom-tabs" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div />
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Preview
              </button>
              <button
                onClick={() => setShowNewCustomTabModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                + New Custom Tab
              </button>
            </div>
          </div>

          {customTabs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6">
                <Monitor size={120} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-600 text-center max-w-2xl mb-6">
                You can create custom tabs to display additional information to your customers via the Customer Portal. 
                For example, you could create a custom tab which displays your product catalog from your website, 
                or communicate special offers and announcements to your customers.
              </p>
              <button
                onClick={() => setShowNewCustomTabModal(true)}
                className="px-6 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                + New Custom Tab
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">TAB NAME</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">URL</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customTabs.map((tab, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{tab.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{tab.url}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Custom Modules Tab */}
      {activeTab === "custom-modules" && (
        <div className="space-y-6">

          {customModules.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">CUSTOM MODULE</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PERMISSIONS</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SAVE AS DRAFT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-sm text-gray-500">
                      No custom modules found
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">CUSTOM MODULE</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PERMISSIONS</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SAVE AS DRAFT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customModules.map((module, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{module.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{module.description}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{module.permissions}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{module.saveAsDraft ? "Yes" : "No"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Portal Tab */}
      {activeTab === "customer-portal" && (
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
                  onClick={handleSave}
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
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                title="Copy URL"
              >
                {copied ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Note: The portal name and portal url will be common for the Customer and Vendor Portal.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">?</span>
            </div>
            <p className="text-sm text-blue-900">
              Have you tried the Customer Portal feature?
            </p>
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

        {/* Configuration Options */}
        <div className="space-y-6">
          {/* Enable MFA */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableMFA}
                onChange={(e) => setEnableMFA(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Enable multi-factor authentication (MFA)
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Multi-factor authentication adds an extra layer of security to your Customer Portal. 
                  When enabled, customers will need to verify their identity using a second factor 
                  (like a code sent to their email or phone) in addition to their password when logging in.
                </p>
              </div>
            </label>
          </div>

          {/* Prevent duplicate payments */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preventDuplicatePayments}
                onChange={(e) => setPreventDuplicatePayments(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Prevent duplicate payments
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Subsequent payments cannot be made for invoices with Pending payments, that is, 
                  invoice payments that were made via ACH or any other method that typically takes 
                  longer to process. Payments will be allowed again if the previous attempt fails.
                </p>
              </div>
            </label>
          </div>

          {/* Allow sign up */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowSignUp}
                onChange={(e) => setAllowSignUp(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow customers to sign up to the Customer Portal
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers and their contacts can sign up to the Customer Portal by themselves, 
                  using signup links that will be displayed to them while making invoice payments via Payment Links.
                </p>
              </div>
            </label>
          </div>

          {/* Notify activity */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyActivity}
                onChange={(e) => setNotifyActivity(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Notify me about Customer Portal activity
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  You will be notified about your customers' portal activity such as payments, 
                  comments or transaction approvals.
                </p>
                {notifyActivity && (
                  <div className="mt-3 ml-6 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Notify via email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyInApp}
                        onChange={(e) => setNotifyInApp(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Notify via in-app notification</span>
                    </label>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Email on comment */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailOnComment}
                onChange={(e) => setEmailOnComment(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Send an email notification to customers when I comment on transactions.
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers will receive an email notification whenever you comment on their 
                  transactions with the Show in Portal option enabled.
                </p>
              </div>
            </label>
          </div>

          {/* Allow upload and edit */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowUploadEdit}
                onChange={(e) => setAllowUploadEdit(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow customers to upload documents and edit their information in the portal
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers will be able to upload documents and edit their basic details, 
                  such as their address and display name.
                </p>
              </div>
            </label>
          </div>

          {/* Allow forward */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowForward}
                onChange={(e) => setAllowForward(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow customers to forward documents from the portal
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers can share invoices with their contact persons via email, 
                  right from the portal.
                </p>
              </div>
            </label>
          </div>

          {/* Bulk payments */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkPayments}
                onChange={(e) => setBulkPayments(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Enable customers to make bulk payments for invoices
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers can select multiple invoices and make a single payment for the selected invoices.
                </p>
              </div>
            </label>
          </div>

          {/* Enable reviews */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableReviews}
                onChange={(e) => setEnableReviews(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Enable customer reviews for my service
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers can rate your service and provide feedback. These reviews are not public.
                </p>
              </div>
            </label>
          </div>

          {/* View Sales Orders */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={viewSalesOrders}
                onChange={(e) => setViewSalesOrders(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow customers to view Sales Orders
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  This option allows your customers to view Sales Orders in the portal.
                </p>
              </div>
            </label>
          </div>

          {/* Display credit notes */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={displayCreditNotes}
                onChange={(e) => setDisplayCreditNotes(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Display credit notes in the portal
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Your customers will be able to view all of their credit notes, the invoices to 
                  which they were applied, and details of refunds.
                </p>
              </div>
            </label>
          </div>

          {/* View projects */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={viewProjects}
                onChange={(e) => setViewProjects(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow customers to view projects and timesheets
                </span>
                {viewProjects && (
                  <div className="mt-2 ml-6 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700 mb-2">
                      Enabling this option will allow your customers to view the following project 
                      related information in the Customer Portal:
                    </p>
                    <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                      <li>Project name and description</li>
                      <li>Logged time, billed and unbilled hours</li>
                      <li>Fixed cost of the project</li>
                      <li>Customer approvals and approve them.</li>
                    </ul>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Secure Public Links */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Secure Public Links
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              When you share invoices or estimates through public links, anyone with the link could 
              access them. To protect your customers' data, you can add an extra layer of security 
              with identity verification.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableIdentityVerification}
                onChange={(e) => setEnableIdentityVerification(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Enable identity verification to view invoices and estimates
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  Require customers to verify their email address or contact number to view or 
                  download invoice and estimate PDFs. This keeps their data secure and is recommended 
                  when sharing transactions outside the Customer Portal.
                </p>
              </div>
            </label>
          </div>

          {/* View subscriptions */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={viewSubscriptions}
                onChange={(e) => setViewSubscriptions(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow customers to view subscriptions
                </span>
                <p className="mt-1 text-xs text-gray-600">
                  This option allows your customers to view their subscriptions and filter the 
                  invoices with respect to subscription.
                </p>
              </div>
            </label>
          </div>

          {/* Provide instant support */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">Q</span>
              </div>
              <p className="text-sm text-blue-900">
                Reach your customers instantly when they're in need! Connect with Zoho SalesIQ to 
                answer customer queries through a live chat option.
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap">
              Connect Now
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
            Save
          </button>
        </div>
      </div>
      )}

      {/* New Custom Tab Modal */}
      {showNewCustomTabModal && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={() => setShowNewCustomTabModal(false)}
        >
          <NewCustomTabModal
            onClose={() => setShowNewCustomTabModal(false)}
            onSave={(tabData) => {
              setCustomTabs([...customTabs, tabData]);
              setShowNewCustomTabModal(false);
            }}
          />
        </div>,
        document.body
      )}

      {/* New Custom Module Modal */}
      {showNewCustomModuleModal && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={() => setShowNewCustomModuleModal(false)}
        >
          <NewCustomModuleModal
            onClose={() => setShowNewCustomModuleModal(false)}
            onSave={(moduleData) => {
              setCustomModules([...customModules, moduleData]);
              setShowNewCustomModuleModal(false);
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

// New Custom Tab Modal Component
function NewCustomTabModal({ onClose, onSave }) {
  const [tabName, setTabName] = useState("");
  const [url, setUrl] = useState("");

  const handleSave = () => {
    if (!tabName || !url) {
      alert("Please fill in all required fields");
      return;
    }
    onSave({ name: tabName, url });
    setTabName("");
    setUrl("");
  };

  return (
    <div
      className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">New Custom Tab</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={20} className="text-red-500" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tab Name <span className="text-red-600">*</span>
            <span className="ml-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline text-gray-400">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M8 6v4M8 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          </label>
          <input
            type="text"
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tab name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL <span className="text-red-600">*</span>
            <span className="ml-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline text-gray-400">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M8 6v4M8 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter URL"
          />
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
  );
}

// New Custom Module Modal Component
function NewCustomModuleModal({ onClose, onSave }) {
  const [moduleName, setModuleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState("");
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const handleSave = () => {
    if (!moduleName) {
      alert("Please fill in the module name");
      return;
    }
    onSave({
      name: moduleName,
      description,
      permissions,
      saveAsDraft
    });
    setModuleName("");
    setDescription("");
    setPermissions("");
    setSaveAsDraft(false);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">New Custom Module</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={20} className="text-red-500" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Module Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter module name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Enter description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Permissions
          </label>
          <input
            type="text"
            value={permissions}
            onChange={(e) => setPermissions(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter permissions"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsDraft}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Save as Draft</span>
          </label>
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
  );
}

