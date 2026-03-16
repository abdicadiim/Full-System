import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const EnableCustomerReviewsModal = ({ isOpen, onClose, onYes, onNo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(21,99,114,0.5)] flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-colors bg-transparent text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-base text-gray-900 mb-4">
            Would you like to enable the option for receiving customer reviews?
          </p>
          <p className="text-sm text-gray-600">
            You can configure this settings later in <strong>Settings</strong> ➡️ <strong>Preferences</strong> ➡️ <strong>Portal.</strong>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => {
              if (onNo) onNo();
              onClose();
            }}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
          >
            No
          </button>
          <button
            onClick={() => {
              if (onYes) onYes();
              onClose();
            }}
            className="px-4 py-2 bg-[rgb(21,99,114)] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[rgb(18,85,98)]"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnableCustomerReviewsModal;

