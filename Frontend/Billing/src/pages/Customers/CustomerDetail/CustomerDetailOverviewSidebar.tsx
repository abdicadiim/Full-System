import React from "react";
import { ChevronDown, ChevronUp, Phone, Plus, Settings, Smartphone, Upload, User, X } from "lucide-react";

type CustomerDetailOverviewSidebarProps = {
  customer: any;
  id?: string;
  displayName: string;
  primaryContact: any;
  resolvedPrimaryContactIndex: number;
  profileImage: string | null;
  isAvatarHovered: boolean;
  setIsAvatarHovered: React.Dispatch<React.SetStateAction<boolean>>;
  profileImageInputRef: React.RefObject<HTMLInputElement | null>;
  handleProfileImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  settingsDropdownRef: React.RefObject<HTMLDivElement | null>;
  isSettingsDropdownOpen: boolean;
  setIsSettingsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openEditContactPerson: (contact: any, index: number) => void;
  navigate: (to: string, options?: any) => void;
  handleEditCustomer: () => void;
  openDeleteContactPersonModal: (index: number) => void;
  setIsDeleteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInviteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showInviteCard: boolean;
  setShowInviteCard: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSection: (section: "address" | "otherDetails" | "contactPersons" | "associateTags" | "recordInfo") => void;
  expandedSections: Record<string, boolean>;
  setAddressType: React.Dispatch<React.SetStateAction<string>>;
  setAddressFormData: React.Dispatch<React.SetStateAction<any>>;
  setShowAddressModal: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenContactPersonSettingsIndex: React.Dispatch<React.SetStateAction<number | null>>;
  openContactPersonSettingsIndex: number | null;
  resetContactPersonModal: () => void;
  setIsAddContactPersonModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  markContactPersonAsPrimary: (index: number) => Promise<void>;
  openAssociateTagsModal: () => void;
  associatedTagLabels: string[];
};

const buildAddressFormData = (customer: any, type: "billing" | "shipping") => {
  const source = type === "billing" ? customer.billingAddress || {} : customer.shippingAddress || {};
  const prefix = type === "billing" ? "billing" : "shipping";

  return {
    attention: source.attention ?? customer[`${prefix}Attention`] ?? "",
    country: source.country ?? customer[`${prefix}Country`] ?? "",
    addressLine1: source.street1 ?? customer[`${prefix}Street1`] ?? "",
    addressLine2: source.street2 ?? customer[`${prefix}Street2`] ?? "",
    city: source.city ?? customer[`${prefix}City`] ?? "",
    state: source.state ?? customer[`${prefix}State`] ?? "",
    zipCode: source.zipCode ?? customer[`${prefix}ZipCode`] ?? "",
    phone: source.phone ?? customer[`${prefix}Phone`] ?? "",
    faxNumber: source.fax ?? customer[`${prefix}Fax`] ?? "",
  };
};

export default function CustomerDetailOverviewSidebar({
  customer,
  id,
  displayName,
  primaryContact,
  resolvedPrimaryContactIndex,
  profileImage,
  isAvatarHovered,
  setIsAvatarHovered,
  profileImageInputRef,
  handleProfileImageUpload,
  settingsDropdownRef,
  isSettingsDropdownOpen,
  setIsSettingsDropdownOpen,
  openEditContactPerson,
  navigate,
  handleEditCustomer,
  openDeleteContactPersonModal,
  setIsDeleteModalOpen,
  setIsInviteModalOpen,
  showInviteCard,
  setShowInviteCard,
  toggleSection,
  expandedSections,
  setAddressType,
  setAddressFormData,
  setShowAddressModal,
  setOpenContactPersonSettingsIndex,
  openContactPersonSettingsIndex,
  resetContactPersonModal,
  setIsAddContactPersonModalOpen,
  markContactPersonAsPrimary,
  openAssociateTagsModal,
  associatedTagLabels,
}: CustomerDetailOverviewSidebarProps) {
  const openAddressModal = (type: "billing" | "shipping") => {
    setAddressType(type);
    setAddressFormData(buildAddressFormData(customer, type));
    setShowAddressModal(true);
  };

  const billingAddress = customer.billingAddress || {};
  const shippingAddress = customer.shippingAddress || {};
  const hasBillingAddress = Boolean(billingAddress.street1 || customer.billingStreet1 || billingAddress.city || customer.billingCity);
  const hasShippingAddress = Boolean(shippingAddress.street1 || customer.shippingStreet1 || shippingAddress.city || customer.shippingCity);
  const portalEnabled =
    !!(customer as any)?.enablePortal ||
    (customer.contactPersons?.some((contact: any) => contact?.hasPortalAccess || contact?.enablePortal) ?? false);

  return (
    <div className="w-[370px] flex-shrink-0 border-r border-gray-200 bg-[#f8f9fc]">
      <div className="border-b border-gray-200 p-4">
        <div className="mb-2 text-sm text-[#1f5fa8]">{(customer as any).companyName || displayName}</div>
        {!showInviteCard ? (
          <div className="flex items-start gap-4">
            <div
              className="group relative flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-gray-200"
              onMouseEnter={() => setIsAvatarHovered(true)}
              onMouseLeave={() => setIsAvatarHovered(false)}
              onClick={() => profileImageInputRef.current?.click()}
            >
              {String(primaryContact?.profileImage || primaryContact?.image || profileImage || "").trim() ? (
                <img src={String(primaryContact?.profileImage || primaryContact?.image || profileImage || "")} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={24} className="text-gray-400" />
              )}
              {isAvatarHovered && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Upload size={16} className="text-white" />
                </div>
              )}
              <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} style={{ display: "none" }} />
            </div>

            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-base font-medium text-gray-900">
                  {primaryContact ? (
                    <>
                      {primaryContact.salutation && `${primaryContact.salutation}. `}
                      {primaryContact.firstName} {primaryContact.lastName}
                    </>
                  ) : (
                    displayName
                  )}
                </span>
                <div className="relative" ref={settingsDropdownRef}>
                  <button
                    className="cursor-pointer p-1 text-gray-500 hover:text-gray-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsSettingsDropdownOpen((previous) => !previous);
                    }}
                  >
                    <Settings size={14} />
                  </button>
                  {isSettingsDropdownOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] rounded-md border border-gray-200 bg-white shadow-lg">
                      <button
                        className="w-full cursor-pointer bg-blue-50 px-4 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-blue-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsSettingsDropdownOpen(false);
                        if (primaryContact && resolvedPrimaryContactIndex >= 0) {
                          openEditContactPerson(primaryContact, resolvedPrimaryContactIndex);
                        } else {
                            handleEditCustomer();
                        }
                      }}
                    >
                        Edit
                      </button>
                      <button
                        className="w-full cursor-pointer px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsSettingsDropdownOpen(false);
                          if (primaryContact && resolvedPrimaryContactIndex >= 0) {
                            openDeleteContactPersonModal(resolvedPrimaryContactIndex);
                          } else {
                            setIsDeleteModalOpen(true);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-1 text-[12px] text-gray-600">{primaryContact?.email || customer.email || ""}</div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-blue-600 hover:underline"
              >
                Invite to Portal
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden rounded-xl border border-gray-100 bg-[#f8f9ff] p-4 shadow-sm">
            <div className="absolute left-0 right-0 top-0 h-1 bg-blue-500"></div>
            <button
              className="absolute right-3 top-3 cursor-pointer text-gray-400 hover:text-gray-600"
              onClick={() => setShowInviteCard(false)}
            >
              <Settings size={14} />
            </button>
            <div className="flex gap-4">
              <div
                className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded-lg bg-gray-300"
                onMouseEnter={() => setIsAvatarHovered(true)}
                onMouseLeave={() => setIsAvatarHovered(false)}
                onClick={() => profileImageInputRef.current?.click()}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200">
                    <User size={24} className="text-white" />
                  </div>
                )}
                {isAvatarHovered && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Upload size={16} className="text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 truncate text-base font-bold text-gray-900">
                  {primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : displayName}
                </div>
                <div className="mb-3 truncate text-sm text-gray-600">{primaryContact?.email || customer.email || ""}</div>
                <div className="mb-3 text-[13px] font-medium text-gray-600">Portal invitation not accepted</div>
                <button className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-blue-600 hover:underline">
                  Re-invite
                </button>
              </div>
            </div>
            <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} style={{ display: "none" }} />
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/50"
          onClick={() => toggleSection("address")}
          aria-expanded={expandedSections.address}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-800">ADDRESS</span>
          {expandedSections.address ? <ChevronUp size={14} className="text-[#2563eb]" /> : <ChevronDown size={14} className="text-[#2563eb]" />}
        </button>

        {expandedSections.address && (
          <div className="px-4 pb-4">
            <div className="mb-4">
              <div className="mb-1 text-sm text-gray-600">Billing Address</div>
              {hasBillingAddress ? (
                <div>
                  <div className="text-sm text-gray-900">
                    {billingAddress.street1 || customer.billingStreet1 || ""}
                    {(billingAddress.city || customer.billingCity) && `, ${billingAddress.city || customer.billingCity}`}
                    {(billingAddress.state || customer.billingState) && `, ${billingAddress.state || customer.billingState}`}
                    {(billingAddress.zipCode || customer.billingZipCode) && ` ${billingAddress.zipCode || customer.billingZipCode}`}
                  </div>
                  <a
                    href="#"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      openAddressModal("billing");
                    }}
                  >
                    Edit
                  </a>
                </div>
              ) : (
                <a
                  href="#"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    openAddressModal("billing");
                  }}
                >
                  No Billing Address - New Address
                </a>
              )}
            </div>

            <div>
              <div className="mb-1 text-sm text-gray-600">Shipping Address</div>
              {hasShippingAddress ? (
                <div>
                  <div className="text-sm text-gray-900">
                    {shippingAddress.street1 || customer.shippingStreet1 || ""}
                    {(shippingAddress.city || customer.shippingCity) && `, ${shippingAddress.city || customer.shippingCity}`}
                    {(shippingAddress.state || customer.shippingState) && `, ${shippingAddress.state || customer.shippingState}`}
                    {(shippingAddress.zipCode || customer.shippingZipCode) && ` ${shippingAddress.zipCode || customer.shippingZipCode}`}
                  </div>
                  <a
                    href="#"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      openAddressModal("shipping");
                    }}
                  >
                    Edit
                  </a>
                </div>
              ) : (
                <a
                  href="#"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    openAddressModal("shipping");
                  }}
                >
                  No Shipping Address - New Address
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/50"
          onClick={() => toggleSection("otherDetails")}
          aria-expanded={expandedSections.otherDetails}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-800">OTHER DETAILS</span>
          {expandedSections.otherDetails ? <ChevronUp size={14} className="text-[#2563eb]" /> : <ChevronDown size={14} className="text-[#2563eb]" />}
        </button>
        {expandedSections.otherDetails && (
          <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-x-3 gap-y-4 px-4 pb-5 pt-2">
            <span className="text-sm text-slate-500">Customer Type</span>
            <span className="text-sm font-medium text-slate-900">{customer.customerType === "individual" ? "Individual" : "Business"}</span>
            <span className="text-sm text-slate-500">Customer Number</span>
            <span className="text-sm font-medium text-slate-900">{customer.customerNumber || "--"}</span>
            <span className="text-sm text-slate-500">Default Currency</span>
            <span className="text-sm font-medium text-slate-900">{customer.currency || "USD"}</span>
            <span className="text-sm text-slate-500">
              <span className="border-b border-dotted border-slate-400">Consolidated Billing</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                (customer as any)?.consolidatedBilling || (customer as any)?.enableConsolidatedBilling || (customer as any)?.isConsolidatedBillingEnabled
                  ? "text-emerald-600"
                  : "text-rose-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  (customer as any)?.consolidatedBilling || (customer as any)?.enableConsolidatedBilling || (customer as any)?.isConsolidatedBillingEnabled
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
              {(customer as any)?.consolidatedBilling || (customer as any)?.enableConsolidatedBilling || (customer as any)?.isConsolidatedBillingEnabled
                ? "Enabled"
                : "Disabled"}
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] leading-none">i</span>
            </span>
            <span className="text-sm text-slate-500">Portal Status</span>
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${portalEnabled ? "text-emerald-600" : "text-rose-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${portalEnabled ? "bg-emerald-500" : "bg-rose-500"}`} />
              {portalEnabled ? "Enabled" : "Disabled"}
            </span>
            <span className="text-sm text-slate-500">Customer Language</span>
            <span className="text-sm font-medium text-slate-900">
              {customer.customerLanguage ? `${customer.customerLanguage.charAt(0).toUpperCase()}${customer.customerLanguage.slice(1)}` : "English"}
            </span>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            className="flex-1 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-gray-800"
            onClick={() => toggleSection("contactPersons")}
            aria-expanded={expandedSections.contactPersons}
          >
            CONTACT PERSONS ({customer.contactPersons?.length || 0})
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
              onClick={() => {
                setOpenContactPersonSettingsIndex(null);
                resetContactPersonModal();
                setIsAddContactPersonModalOpen(true);
              }}
              aria-label="Add contact person"
              title="Add contact person"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="cursor-pointer rounded p-1 text-blue-600 hover:bg-blue-50"
              onClick={() => toggleSection("contactPersons")}
              aria-label={expandedSections.contactPersons ? "Collapse" : "Expand"}
            >
              {expandedSections.contactPersons ? <ChevronUp size={14} className="text-[#2563eb]" /> : <ChevronDown size={14} className="text-[#2563eb]" />}
            </button>
          </div>
        </div>
        {expandedSections.contactPersons && (
          <div className="px-4 pb-4">
            {customer.contactPersons && customer.contactPersons.length > 0 ? (
              <div className="space-y-0">
                {customer.contactPersons.map((contact: any, index: number) => {
                  const name =
                    String(`${contact?.salutation ? `${contact.salutation}. ` : ""}${contact?.firstName || ""} ${contact?.lastName || ""}`).trim() ||
                    String(contact?.name || contact?.displayName || "Contact");
                  const email = String(contact?.email || "").trim();
                  const workPhone = String(contact?.workPhone || contact?.phone || "").trim();
                  const mobile = String(contact?.mobile || contact?.mobilePhone || "").trim();
                  const avatar = contact?.profileImage || contact?.image || null;
                  const isPrimary = Boolean(contact?.isPrimary);

                  return (
                    <div key={String(email || name || index)} className="flex items-start gap-3 border-b border-gray-100 py-4 last:border-b-0">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-200">
                        {avatar ? <img src={String(avatar)} alt={name} className="h-full w-full object-cover" /> : <User size={22} className="text-gray-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 truncate text-sm font-semibold text-gray-900">
                              <span className="truncate">{name}</span>
                              {isPrimary && (
                                <span className="flex-shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  Primary
                                </span>
                              )}
                            </div>
                            {email && <div className="truncate text-sm text-gray-600">{email}</div>}
                          </div>
                          <div className="relative flex-shrink-0" data-contact-person-menu-root="true">
                            <button
                              type="button"
                              className="cursor-pointer p-1 text-gray-500 hover:text-gray-700"
                              title="Contact settings"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenContactPersonSettingsIndex((previous) => (previous === index ? null : index));
                              }}
                            >
                              <Settings size={14} />
                            </button>
                            {openContactPersonSettingsIndex === index && (
                              <div className="absolute right-0 top-full z-[120] mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                                <button
                                  type="button"
                                  className="mx-1 my-1 w-[calc(100%-8px)] cursor-pointer rounded-md px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenContactPersonSettingsIndex(null);
                                    openEditContactPerson(contact, index);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="w-full cursor-pointer px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    setOpenContactPersonSettingsIndex(null);
                                    await markContactPersonAsPrimary(index);
                                  }}
                                >
                                  Mark as Primary
                                </button>
                                <button
                                  type="button"
                                  className="w-full cursor-pointer px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenContactPersonSettingsIndex(null);
                                    openDeleteContactPersonModal(index);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {workPhone && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                            <Phone size={14} className="text-gray-500" />
                            <span className="truncate">{workPhone}</span>
                          </div>
                        )}
                        {mobile && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                            <Smartphone size={14} className="text-gray-500" />
                            <span className="truncate">{mobile}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-gray-500">No contact persons found.</div>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            className="flex-1 cursor-pointer text-left text-xs font-semibold uppercase tracking-wider text-gray-800"
            onClick={() => toggleSection("associateTags")}
            aria-expanded={expandedSections.associateTags}
          >
            ASSOCIATE TAGS
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
              onClick={() => openAssociateTagsModal()}
              aria-label="Add tag"
              title="Add tag"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="cursor-pointer rounded p-1 text-blue-600 hover:bg-blue-50"
              onClick={() => toggleSection("associateTags")}
              aria-label={expandedSections.associateTags ? "Collapse" : "Expand"}
            >
              {expandedSections.associateTags ? <ChevronUp size={14} className="text-[#2563eb]" /> : <ChevronDown size={14} className="text-[#2563eb]" />}
            </button>
          </div>
        </div>
        {expandedSections.associateTags && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {associatedTagLabels.length > 0 ? (
                associatedTagLabels.map((tag, index) => (
                  <span key={`${tag}-${index}`} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                    {tag}
                    <X size={12} className="text-gray-500" />
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">No tags associated</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 p-4">
        <div className="border border-green-200 bg-green-50 p-4">
          <p className="mb-3 text-sm text-gray-700">
            Customer Portal allows your customers to keep track of all the transactions between them and your business.
          </p>
          <button className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Enable Portal</button>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/50"
          onClick={() => toggleSection("recordInfo")}
          aria-expanded={expandedSections.recordInfo}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-800">RECORD INFO</span>
          {expandedSections.recordInfo ? <ChevronUp size={14} className="text-[#2563eb]" /> : <ChevronDown size={14} className="text-[#2563eb]" />}
        </button>
        {expandedSections.recordInfo && (
          <div className="px-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customer Number:</span>
                <span className="text-sm font-medium text-gray-900">{customer.customerNumber || "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customer ID:</span>
                <span className="text-sm font-medium text-gray-900">{customer.id || id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created On:</span>
                <span className="text-sm font-medium text-gray-900">
                  {customer.createdDate ? new Date(customer.createdDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "03/12/2025"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created By:</span>
                <span className="text-sm font-medium text-gray-900">{customer.createdBy || "JIRDE HUSSEIN KHALIF"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
