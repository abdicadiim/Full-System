import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2 as LinkIcon, Image, List, ChevronDown } from "lucide-react";

export default function EditReminderModal({ reminder, onClose, onSave }) {
  const template = reminder?.template || {};
  const isSentReminder = reminder?.id === "sent-invoices";

  const defaultSubject = isSentReminder
    ? "Your invoice %InvoiceNumber% is due on %DueDate%"
    : "Payment of %Balance% is outstanding for %InvoiceNumber%";

  const defaultBody = isSentReminder
    ? `Dear %CustomerName%,

This is a friendly reminder that your invoice will be due on %DueDate%.

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

**Invoice# : %InvoiceNumber%**
Dated : %InvoiceDate%

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Due Date : %DueDate%
Amount : %Balance%

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

If you have already paid, please accept our apologies and kindly ignore this reminder.

Regards,
%UserName%
%CompanyName%`
    : `Dear %CustomerName%,

You might have missed the payment date and the invoice is now overdue by %OverdueDays% days.

─────────────────────────────────────

**Invoice# : %InvoiceNumber%**
Dated : %InvoiceDate%

─────────────────────────────────────

Due Date : %DueDate%
Amount : %Balance%

─────────────────────────────────────

Not to worry at all ! View your invoice and take the easy way out by making an online payment.

If you have already paid, please accept our apologies and kindly ignore this payment reminder.

Regards,
%UserName%
%CompanyName%`;

  const [from, setFrom] = useState(template.from || "");
  const [cc, setCc] = useState(template.cc || "");
  const [bcc, setBcc] = useState(template.bcc || "");
  const [subject, setSubject] = useState(template.subject || defaultSubject);
  const [emailBody, setEmailBody] = useState(template.body || defaultBody);

  const handleSave = () => {
    onSave({
      ...reminder,
      from,
      cc,
      bcc,
      subject,
      emailBody
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{reminder.name}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="relative">
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select email"
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This email address will be used as the from address while sending. Other users can choose their email address if they wish to change it.
            </p>
          </div>

          {/* Cc */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cc
            </label>
            <div className="relative">
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select email"
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bcc */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bcc
            </label>
            <div className="relative">
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select email"
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email Body Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            {/* Toolbar */}
            <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex items-center gap-2 flex-wrap">
              <select className="h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none">
                <option>Normal Text</option>
                <option>Heading 1</option>
                <option>Heading 2</option>
                <option>Heading 3</option>
              </select>
              <div className="h-6 w-px bg-gray-300" />
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Bold">
                <Bold size={16} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Italic">
                <Italic size={16} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Underline">
                <Underline size={16} className="text-gray-600" />
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Text Color">
                <span className="text-sm font-semibold">A</span>
                <div className="h-3 w-4 border border-gray-300 bg-red-500" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Background Color">
                <span className="text-sm font-semibold">A</span>
                <div className="h-3 w-4 border border-gray-300 bg-yellow-300" />
              </button>
              <select className="h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none">
                <option>Times New Ro...</option>
                <option>Arial</option>
                <option>Helvetica</option>
              </select>
              <div className="h-6 w-px bg-gray-300" />
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Align Left">
                <AlignLeft size={16} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Align Center">
                <AlignCenter size={16} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Align Right">
                <AlignRight size={16} className="text-gray-600" />
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Bullet List">
                <List size={16} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Numbered List">
                <span className="text-sm font-semibold">1.</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Insert Link">
                <LinkIcon size={16} className="text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded" title="Insert Image">
                <Image size={16} className="text-gray-600" />
              </button>
              <div className="flex-1" />
              <select className="h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none">
                <option>Insert Placeholders</option>
                <option>%CustomerName%</option>
                <option>%InvoiceNumber%</option>
                <option>%Balance%</option>
                <option>%OverdueDays%</option>
                <option>%InvoiceDate%</option>
                <option>%DueDate%</option>
                <option>%UserName%</option>
                <option>%CompanyName%</option>
              </select>
            </div>
            {/* Text Area */}
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 border-x border-b border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

