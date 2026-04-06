import React from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HelpSidebar({ isOpen, onClose }: Props) {
  return (
    <div
      className={`fixed top-0 right-0 h-screen w-[320px] bg-white border-l border-gray-200 shadow-2xl z-[1000] transition-transform duration-300 transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } flex flex-col`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <h2 className="text-sm font-semibold text-gray-800 m-0">Help</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          title="Close this instant helper"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-[14px] font-bold text-gray-900 mb-6 mt-2">
          To assign a user as the customer owner:
        </h3>

        <ul className="space-y-6 list-none p-0">
          <li className="flex gap-3 items-start">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
            <p className="text-[12px] leading-relaxed text-gray-700 m-0">
              Go to <span className="font-bold">Users & Roles</span> under Preferences.
            </p>
          </li>
          <li className="flex gap-3 items-start">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
            <p className="text-[12px] leading-relaxed text-gray-700 m-0">
              Invite users with the predefined role <span className="font-bold">Staff - Assigned Customers Only</span>.
            </p>
          </li>
          <li className="flex gap-3 items-start">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
            <p className="text-[12px] leading-relaxed text-gray-700 m-0">
              Select the user with that role as a <span className="font-bold">Customer Owner</span> when you create or
              edit a customer.
            </p>
          </li>
        </ul>

        <p className="mt-8 text-[12px] italic text-gray-500 leading-relaxed border-t border-gray-50 pt-6">
          Now, this user will only be able to view the data related to this customer.
        </p>
      </div>
    </div>
  );
}
