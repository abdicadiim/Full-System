import React from "react";
import { Loader2, Upload, X } from "lucide-react";
import SearchableDropdown from "../../../components/ui/SearchableDropdown";
import { PHONE_CODE_OPTIONS } from "./customerDetailConstants";

type CustomerContactPersonModalProps = {
  isOpen: boolean;
  editingContactPersonIndex: number | null;
  newContactPerson: any;
  setNewContactPerson: React.Dispatch<React.SetStateAction<any>>;
  contactPersonWorkPhoneCode: string;
  setContactPersonWorkPhoneCode: (value: string) => void;
  contactPersonMobilePhoneCode: string;
  setContactPersonMobilePhoneCode: (value: string) => void;
  contactPersonProfilePreview: string | null;
  setContactPersonProfilePreview: React.Dispatch<React.SetStateAction<string | null>>;
  contactPersonProfileInputRef: React.RefObject<HTMLInputElement>;
  handleContactPersonProfileFile: (file?: File | null) => void;
  isSavingContactPerson: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
};

const phoneCodeOptions = PHONE_CODE_OPTIONS.map((option) => ({
  value: option.code,
  label: `${option.code} ${option.name}`,
}));

const inputClassName =
  "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

export default function CustomerContactPersonModal({
  isOpen,
  editingContactPersonIndex,
  newContactPerson,
  setNewContactPerson,
  contactPersonWorkPhoneCode,
  setContactPersonWorkPhoneCode,
  contactPersonMobilePhoneCode,
  setContactPersonMobilePhoneCode,
  contactPersonProfilePreview,
  setContactPersonProfilePreview,
  contactPersonProfileInputRef,
  handleContactPersonProfileFile,
  isSavingContactPerson,
  onClose,
  onSave,
}: CustomerContactPersonModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[2000] flex items-start justify-center pt-10 pb-10 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-6 max-h-[calc(100vh-80px)] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingContactPersonIndex !== null ? "Edit Contact Person" : "Add Contact Person"}
          </h2>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 bg-white border-2 border-blue-600 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={newContactPerson.salutation}
                    onChange={(event) =>
                      setNewContactPerson((prev: any) => ({ ...prev, salutation: event.target.value }))
                    }
                    className={inputClassName}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                  </select>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newContactPerson.firstName}
                    onChange={(event) =>
                      setNewContactPerson((prev: any) => ({ ...prev, firstName: event.target.value }))
                    }
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newContactPerson.lastName}
                    onChange={(event) =>
                      setNewContactPerson((prev: any) => ({ ...prev, lastName: event.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newContactPerson.email}
                  onChange={(event) =>
                    setNewContactPerson((prev: any) => ({ ...prev, email: event.target.value }))
                  }
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <div className="space-y-3">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <SearchableDropdown
                      value={contactPersonWorkPhoneCode}
                      options={phoneCodeOptions}
                      placeholder="Code"
                      accentColor="#2563eb"
                      onChange={setContactPersonWorkPhoneCode}
                    />
                    <input
                      type="tel"
                      placeholder="Work Phone"
                      value={newContactPerson.workPhone}
                      onChange={(event) =>
                        setNewContactPerson((prev: any) => ({ ...prev, workPhone: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <SearchableDropdown
                      value={contactPersonMobilePhoneCode}
                      options={phoneCodeOptions}
                      placeholder="Code"
                      accentColor="#2563eb"
                      onChange={setContactPersonMobilePhoneCode}
                    />
                    <input
                      type="tel"
                      placeholder="Mobile"
                      value={newContactPerson.mobile}
                      onChange={(event) =>
                        setNewContactPerson((prev: any) => ({ ...prev, mobile: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skype Name/Number</label>
                <input
                  type="text"
                  placeholder="Skype Name/Number"
                  value={newContactPerson.skype}
                  onChange={(event) =>
                    setNewContactPerson((prev: any) => ({ ...prev, skype: event.target.value }))
                  }
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other Details</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Designation"
                    value={newContactPerson.designation}
                    onChange={(event) =>
                      setNewContactPerson((prev: any) => ({ ...prev, designation: event.target.value }))
                    }
                    className={inputClassName}
                  />
                  <input
                    type="text"
                    placeholder="Department"
                    value={newContactPerson.department}
                    onChange={(event) =>
                      setNewContactPerson((prev: any) => ({ ...prev, department: event.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="enablePortalAccess"
                    checked={Boolean(newContactPerson.enablePortalAccess)}
                    onChange={(event) =>
                      setNewContactPerson((prev: any) => ({
                        ...prev,
                        enablePortalAccess: event.target.checked,
                      }))
                    }
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="enablePortalAccess" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                      Enable portal access
                    </label>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      This customer will be able to see all their transactions with your organization by
                      logging in to the portal using their email address.{" "}
                      <a
                        href="#"
                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                        onClick={(event) => event.preventDefault()}
                      >
                        Learn More
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[320px] lg:pt-2">
              <div
                className="h-[310px] w-full rounded-lg border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-center px-6"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleContactPersonProfileFile(event.dataTransfer?.files?.[0]);
                }}
              >
                {contactPersonProfilePreview ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-28 h-28 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={contactPersonProfilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => contactPersonProfileInputRef.current?.click()}
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:underline"
                      onClick={() => setContactPersonProfilePreview(null)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                      <Upload size={18} className="text-blue-600" />
                    </div>
                    <div className="text-sm font-medium text-gray-800 mb-1">Drag &amp; Drop Profile Image</div>
                    <div className="text-xs text-gray-500 mb-4">
                      Supported Files: jpg, jpeg, png, gif, bmp
                      <div className="mt-1">Maximum File Size: 5MB</div>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => contactPersonProfileInputRef.current?.click()}
                    >
                      Upload File
                    </button>
                  </>
                )}
                <input
                  ref={contactPersonProfileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleContactPersonProfileFile(event.target.files?.[0])}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white z-10 flex items-center justify-start gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            className={`px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors ${
              isSavingContactPerson ? "opacity-70 cursor-not-allowed" : ""
            }`}
            onClick={onSave}
            disabled={isSavingContactPerson}
          >
            {isSavingContactPerson ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </span>
            ) : (
              "Save"
            )}
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
