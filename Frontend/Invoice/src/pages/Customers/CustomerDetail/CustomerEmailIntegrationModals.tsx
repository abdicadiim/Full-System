import React from "react";
import { X } from "lucide-react";

type CustomerEmailIntegrationModalProps = {
  provider: "outlook" | "zoho";
  isOpen: boolean;
  onClose: () => void;
  onEnable: () => void;
};

const content = {
  outlook: {
    title: "Outlook Integration",
    heading: "Connect your Outlook account",
    learnMore: "Learn more about Outlook integration",
  },
  zoho: {
    title: "Zoho Mail Integration",
    heading: "Connect your Zoho Mail account",
    learnMore: "Learn more about Zoho Mail integration",
  },
} as const;

export function CustomerEmailIntegrationModal({
  provider,
  isOpen,
  onClose,
  onEnable,
}: CustomerEmailIntegrationModalProps) {
  if (!isOpen) return null;

  const details = content[provider];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{details.title}</h2>
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white hover:bg-blue-700 cursor-pointer"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-3xl font-bold">
              {provider === "outlook" ? "O" : "@"}
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 text-center mb-6">{details.heading}</h3>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">Associate emails to transactions for reference.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">Include mail attachments into transactions.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">
                Add email conversations to a transaction&apos;s activity history.
              </span>
            </li>
          </ul>

          <div className="mb-6">
            <a
              href="#"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              onClick={(event) => event.preventDefault()}
            >
              {details.learnMore}
            </a>
          </div>

          <div className="mb-6 text-sm text-gray-600">
            I agree to the provider&apos;s{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 hover:underline"
              onClick={(event) => event.preventDefault()}
            >
              terms of use
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 hover:underline"
              onClick={(event) => event.preventDefault()}
            >
              privacy policy
            </a>{" "}
            and understand that the rights to use this product do not come from Zoho.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onEnable}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 cursor-pointer transition-colors"
            >
              Enable Integration
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
