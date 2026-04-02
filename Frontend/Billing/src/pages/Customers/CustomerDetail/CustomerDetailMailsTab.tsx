import React from "react";
import { ChevronDown, Mail } from "lucide-react";

type CustomerDetailMailsTabProps = {
  mails: any[];
  linkEmailDropdownRef: React.RefObject<HTMLDivElement>;
  isLinkEmailDropdownOpen: boolean;
  onToggleLinkEmailDropdown: () => void;
  onConnectZohoMail: () => void;
  onConnectOutlook: () => void;
};

export default function CustomerDetailMailsTab({
  mails,
  linkEmailDropdownRef,
  isLinkEmailDropdownOpen,
  onToggleLinkEmailDropdown,
  onConnectZohoMail,
  onConnectOutlook,
}: CustomerDetailMailsTabProps) {
  return (
    <div className="flex-1 min-h-0 p-6" style={{ paddingRight: 0 }}>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">System Mails</h3>
          <div className="relative" ref={linkEmailDropdownRef}>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-[#0f5ca8] cursor-pointer hover:underline"
              onClick={onToggleLinkEmailDropdown}
            >
              <Mail size={16} className="text-[#0f5ca8]" />
              Link Email account
              <ChevronDown size={14} />
            </button>
            {isLinkEmailDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={onConnectZohoMail}
                >
                  Zoho Mail
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={onConnectOutlook}
                >
                  Connect Outlook
                </button>
                <div className="px-4 py-2 text-sm text-gray-700 cursor-default">Connect Other Email</div>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {mails.length > 0 ? (
            mails.map((mail) => (
              <div key={String(mail.id)} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm flex-shrink-0">
                  {mail.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-600 mb-0.5">
                    To <span className="font-medium text-gray-900">{mail.to}</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{mail.subject}</span>
                    {String(mail.description || "").trim() && (
                      <>
                        <span className="text-gray-400"> - </span>
                        <span className="text-gray-600">{mail.description}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{mail.date}</div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
              <Mail size={48} />
              <p>No emails sent to this customer yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
