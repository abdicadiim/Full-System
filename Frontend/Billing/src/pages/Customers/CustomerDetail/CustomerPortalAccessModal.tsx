import React from "react";
import { X } from "lucide-react";

type CustomerPortalAccessModalProps = {
  isOpen: boolean;
  portalAccessContacts: any[];
  setPortalAccessContacts: React.Dispatch<React.SetStateAction<any[]>>;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

export default function CustomerPortalAccessModal({
  isOpen,
  portalAccessContacts,
  setPortalAccessContacts,
  onClose,
  onSave,
}: CustomerPortalAccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configure Portal Access</h2>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    NAME
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    EMAIL ADDRESS
                  </th>
                </tr>
              </thead>
              <tbody>
                {portalAccessContacts.length > 0 ? (
                  portalAccessContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={contact.hasAccess}
                            onChange={(event) => {
                              setPortalAccessContacts((prev) =>
                                prev.map((currentContact) =>
                                  currentContact.id === contact.id
                                    ? { ...currentContact, hasAccess: event.target.checked }
                                    : currentContact,
                                ),
                              );
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-900">{contact.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {contact.email ? (
                          <span className="text-sm text-gray-900">{contact.email}</span>
                        ) : (
                          <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                            onClick={() => {
                              const email = window.prompt("Enter email address:");
                              if (!email) return;
                              setPortalAccessContacts((prev) =>
                                prev.map((currentContact) =>
                                  currentContact.id === contact.id
                                    ? { ...currentContact, email }
                                    : currentContact,
                                ),
                              );
                            }}
                          >
                            Add Email
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-sm text-gray-500">
                      No contacts available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors"
            onClick={onSave}
          >
            Save
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
