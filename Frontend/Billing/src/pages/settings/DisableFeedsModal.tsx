import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function DisableFeedsModal({ isOpen, onClose, onConfirm }) {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8">
                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0">
                            <AlertTriangle size={48} className="text-orange-500 fill-orange-100" />
                        </div>
                        <div>
                            <p className="text-gray-700 text-lg leading-relaxed">
                                You will have to manually enter the exchange rates for each currency, if you disable this feature.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-8 py-4 flex items-center gap-3">
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Disable
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
