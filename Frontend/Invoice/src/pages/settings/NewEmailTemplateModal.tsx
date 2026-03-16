import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2 as LinkIcon, Image, List, ChevronDown } from "lucide-react";

export default function NewEmailTemplateModal({ emailType, onClose, onSave }) {
  const [templateName, setTemplateName] = useState("Default");
  const [from, setFrom] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [showCcDropdown, setShowCcDropdown] = useState(false);
  const [showBccDropdown, setShowBccDropdown] = useState(false);
  const [showPlaceholderDropdown, setShowPlaceholderDropdown] = useState(false);

  const placeholders = [
    "%InvoiceNumber%",
    "%CompanyName%",
    "%CustomerName%",
    "%Balance%",
    "%InvoiceDate%",
    "%DueDate%",
    "%OverdueDays%",
    "%UserName%"
  ];

  const handleInsertPlaceholder = (placeholder) => {
    setEmailBody(prev => prev + placeholder);
    setShowPlaceholderDropdown(false);
  };

  const handleSave = () => {
    onSave({
      templateName,
      from,
      cc,
      bcc,
      subject,
      emailBody,
      setAsDefault,
      emailType
    });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {emailType} - {templateName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template name"
            />
          </div>

          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <input
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email address"
            />
            <p className="text-xs text-gray-500 mt-1">
              This email address will be used as the from address while sending {emailType?.toLowerCase() || "emails"}. Other users can choose their email address if they wish to change it.
            </p>
          </div>

          {/* Cc */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cc</label>
            <div className="relative">
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Cc email addresses"
              />
              <button
                onClick={() => setShowCcDropdown(!showCcDropdown)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Bcc */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bcc</label>
            <div className="relative">
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Bcc email addresses"
              />
              <button
                onClick={() => setShowBccDropdown(!showBccDropdown)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown size={16} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email subject"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
            {/* Rich Text Editor Toolbar */}
            <div className="border border-gray-300 rounded-t-lg p-2 bg-gray-50 flex items-center gap-2 flex-wrap">
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <Bold size={16} className="text-gray-700" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <Italic size={16} className="text-gray-700" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <Underline size={16} className="text-gray-700" />
              </button>
              <div className="w-px h-6 bg-gray-300"></div>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <AlignLeft size={16} className="text-gray-700" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <AlignCenter size={16} className="text-gray-700" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <AlignRight size={16} className="text-gray-700" />
              </button>
              <div className="w-px h-6 bg-gray-300"></div>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <List size={16} className="text-gray-700" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <Image size={16} className="text-gray-700" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition">
                <LinkIcon size={16} className="text-gray-700" />
              </button>
              <div className="flex-1"></div>
              <div className="relative">
                <button
                  onClick={() => setShowPlaceholderDropdown(!showPlaceholderDropdown)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                >
                  Insert Placeholder
                  <ChevronDown size={14} />
                </button>
                {showPlaceholderDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {placeholders.map((placeholder) => (
                        <button
                          key={placeholder}
                          onClick={() => handleInsertPlaceholder(placeholder)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          {placeholder}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full h-64 px-4 py-3 border border-gray-300 border-t-0 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter email body content..."
            />
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="setAsDefault"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="setAsDefault" className="text-sm text-gray-700">
              Set this to default
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
    </div>,
    document.body
  );
}

