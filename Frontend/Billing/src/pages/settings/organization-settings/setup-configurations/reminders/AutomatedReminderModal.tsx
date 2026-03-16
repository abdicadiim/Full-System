import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2 as LinkIcon, Image, List } from "lucide-react";
import { getCurrentUser } from "../../../../../services/auth";

export default function AutomatedReminderModal({ reminder, onClose, onSave }) {
  const isPaymentExpected = reminder?.name === "Payment Expected";
  const currentUser = getCurrentUser();
  const db = reminder?.db;
  const dbConditions = db?.conditions || {};
  const dbEmail = db?.email || {};
  const dbRecipients = db?.recipients || {};

  const initialDays =
    typeof dbConditions.daysBefore === "number"
      ? dbConditions.daysBefore
      : typeof dbConditions.daysAfter === "number"
        ? dbConditions.daysAfter
        : 0;

  const initialWhen =
    typeof dbConditions.daysBefore === "number"
      ? "before"
      : typeof dbConditions.daysAfter === "number"
        ? "after"
        : "after";

  const initialBasedOn =
    dbConditions.basedOn === "expectedPaymentDate"
      ? "expected payment date"
      : reminder?.category?.includes("Expected Payment Date")
        ? "expected payment date"
        : "due date";

  const initialCc = Array.isArray(dbEmail.cc) ? dbEmail.cc.join(", ") : dbEmail.cc || "";
  const initialBcc = Array.isArray(dbEmail.bcc) ? dbEmail.bcc.join(", ") : dbEmail.bcc || "";
  const initialTo =
    (Array.isArray(dbRecipients.customEmails) && dbRecipients.customEmails[0]) ||
    currentUser?.email ||
    "";
  
  const [name, setName] = useState(db?.name || reminder?.name || "");
  const [remindDays, setRemindDays] = useState(initialDays);
  const [remindWhen, setRemindWhen] = useState(initialWhen);
  const [remindBasedOn, setRemindBasedOn] = useState(initialBasedOn);
  const [to, setTo] = useState(initialTo);
  const [remindRecipient, setRemindRecipient] = useState("me (jirdehusseinkhalif@gmail.com)");
  const [from, setFrom] = useState(dbEmail.from || "");
  const [cc, setCc] = useState(initialCc);
  const [bcc, setBcc] = useState(initialBcc);
  const [subject, setSubject] = useState(dbEmail.subject || "Payment of %Balance% is outstanding for %InvoiceNumber%");
  const [emailBody, setEmailBody] = useState(dbEmail.body || `Dear %CustomerName%,

This is to remind you about the payment details for the below invoice.

─────────────────────────────────────

**Invoice# : %InvoiceNumber%**
Due Date : %DueDate%

─────────────────────────────────────

Overdue By : %OverdueDays%
Amount : %Balance%

─────────────────────────────────────

View your invoice and take the easy way out by making an online payment.

If you have already paid, please accept our apologies and kindly ignore this payment reminder.`);
  const [enableReminder, setEnableReminder] = useState(typeof db?.isActive === "boolean" ? db.isActive : true);

  const handleSave = () => {
    onSave({
      ...reminder,
      name,
      remindDays,
      remindWhen,
      remindBasedOn,
      to: isPaymentExpected ? to : undefined,
      remindRecipient: !isPaymentExpected ? remindRecipient : undefined,
      from: !isPaymentExpected ? from : undefined,
      cc,
      bcc,
      subject: !isPaymentExpected ? subject : undefined,
      emailBody: !isPaymentExpected ? emailBody : undefined,
      enabled: enableReminder
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto ${
          isPaymentExpected ? "max-w-md" : "max-w-4xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Automated Reminders</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name - Only for non-Payment Expected */}
          {!isPaymentExpected && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reminder name"
              />
            </div>
          )}

          {/* Remind */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remind
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={remindDays}
                onChange={(e) => setRemindDays(parseInt(e.target.value) || 0)}
                className="w-20 h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
              <span className="text-sm text-gray-700">day(s)</span>
              <div className="relative">
                <select
                  value={remindWhen}
                  onChange={(e) => setRemindWhen(e.target.value)}
                  className="h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="after">after</option>
                  <option value="before">before</option>
                  <option value="on">on</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-sm text-gray-700">{remindBasedOn}</span>
            </div>
          </div>

          {/* To - Only for Payment Expected */}
          {isPaymentExpected && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>
          )}

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

          {/* Enable this reminder */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableReminder}
                onChange={(e) => setEnableReminder(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Enable this reminder</span>
            </label>
          </div>

          {/* Full form fields - Only for non-Payment Expected */}
          {!isPaymentExpected && (
            <>
              {/* Remind (Recipient) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remind
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={remindRecipient}
                    onChange={(e) => setRemindRecipient(e.target.value)}
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

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
            </>
          )}
        </div>

        <div className={`flex items-center gap-3 p-6 border-t border-gray-200 ${
          isPaymentExpected ? "justify-end" : "justify-start"
        }`}>
          {isPaymentExpected ? (
            <>
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
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Save
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

