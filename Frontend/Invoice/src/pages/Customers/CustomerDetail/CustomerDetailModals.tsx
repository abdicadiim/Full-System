import React from "react";
import { ChevronDown, Loader2, Mail, Plus, Search, UserPlus, X } from "lucide-react";
import CustomerDetailCalendar from "./CustomerDetailCalendar";
import { PDF_TEMPLATE_OPTIONS } from "./customerDetailConstants";
import type { CustomerPdfTemplates, ExtendedCustomer } from "./customerDetailTypes";

type PrintStatementsModalProps = {
  isOpen: boolean;
  startDatePickerRef: React.RefObject<HTMLDivElement>;
  endDatePickerRef: React.RefObject<HTMLDivElement>;
  printStatementStartDate: Date;
  printStatementEndDate: Date;
  isStartDatePickerOpen: boolean;
  isEndDatePickerOpen: boolean;
  startDateCalendarMonth: Date;
  endDateCalendarMonth: Date;
  onClose: () => void;
  onSubmit: () => void;
  onToggleStartDatePicker: () => void;
  onToggleEndDatePicker: () => void;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onPrevStartMonth: () => void;
  onNextStartMonth: () => void;
  onPrevEndMonth: () => void;
  onNextEndMonth: () => void;
  formatDateForDisplay: (date: Date) => string;
};

type MergeCustomerOption = Pick<
  ExtendedCustomer,
  "id" | "_id" | "name" | "displayName" | "companyName" | "email"
>;

type MergeModalProps = {
  isOpen: boolean;
  currentCustomerName: string;
  mergeTargetCustomer: MergeCustomerOption | null;
  isMergeCustomerDropdownOpen: boolean;
  mergeCustomerSearch: string;
  filteredMergeCustomers: MergeCustomerOption[];
  mergeCustomerDropdownRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onToggleDropdown: () => void;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customer: MergeCustomerOption) => void;
  onSubmit: () => void;
};

type AssociateTemplatesModalProps = {
  isOpen: boolean;
  pdfTemplates: CustomerPdfTemplates;
  onClose: () => void;
  onSave: () => void;
  onTemplateSelect: (
    category: "pdf",
    field: keyof CustomerPdfTemplates,
    value: string,
  ) => void;
  onCreateNewTemplate: () => void;
};

type CloneModalProps = {
  isOpen: boolean;
  cloneContactType: string;
  isCloning: boolean;
  onClose: () => void;
  onTypeChange: (value: string) => void;
  onProceed: () => void;
};

type InviteModalProps = {
  isOpen: boolean;
  inviteMethod: "email" | "social";
  emailValue: string;
  isSendingInvitation: boolean;
  onClose: () => void;
  onInviteMethodChange: (value: "email" | "social") => void;
  onInviteEmailChange: (value: string) => void;
  onWhatsAppShare: () => void | Promise<void>;
  onFacebookShare: () => void | Promise<void>;
  onTwitterShare: () => void | Promise<void>;
  onLinkedInShare: () => void | Promise<void>;
  onCopyInvitationLink: () => void | Promise<void>;
  onSendInvitation: () => void | Promise<void>;
};

export function CustomerPrintStatementsModal({
  isOpen,
  startDatePickerRef,
  endDatePickerRef,
  printStatementStartDate,
  printStatementEndDate,
  isStartDatePickerOpen,
  isEndDatePickerOpen,
  startDateCalendarMonth,
  endDateCalendarMonth,
  onClose,
  onSubmit,
  onToggleStartDatePicker,
  onToggleEndDatePicker,
  onStartDateChange,
  onEndDateChange,
  onPrevStartMonth,
  onNextStartMonth,
  onPrevEndMonth,
  onNextEndMonth,
  formatDateForDisplay,
}: PrintStatementsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Print Customer statements</h2>
          <button
            type="button"
            className="cursor-pointer p-1 text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-gray-600">
            You can print your customer's statements for the selected date range.
          </p>

          <div className="mb-4" ref={startDatePickerRef}>
            <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
            <div
              className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={onToggleStartDatePicker}
            >
              {formatDateForDisplay(printStatementStartDate)}
            </div>
            {isStartDatePickerOpen && (
              <CustomerDetailCalendar
                calendarMonth={startDateCalendarMonth}
                selectedDate={printStatementStartDate}
                onSelectDate={onStartDateChange}
                onPrevMonth={onPrevStartMonth}
                onNextMonth={onNextStartMonth}
              />
            )}
          </div>

          <div className="mb-4" ref={endDatePickerRef}>
            <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
            <div
              className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={onToggleEndDatePicker}
            >
              {formatDateForDisplay(printStatementEndDate)}
            </div>
            {isEndDatePickerOpen && (
              <CustomerDetailCalendar
                calendarMonth={endDateCalendarMonth}
                selectedDate={printStatementEndDate}
                onSelectDate={onEndDateChange}
                onPrevMonth={onPrevEndMonth}
                onNextMonth={onNextEndMonth}
              />
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
          <button
            type="button"
            className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={onSubmit}
          >
            Print Statements
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerMergeModal({
  isOpen,
  currentCustomerName,
  mergeTargetCustomer,
  isMergeCustomerDropdownOpen,
  mergeCustomerSearch,
  filteredMergeCustomers,
  mergeCustomerDropdownRef,
  onClose,
  onToggleDropdown,
  onSearchChange,
  onSelectCustomer,
  onSubmit,
}: MergeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-[500px] rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="m-0 text-lg font-semibold text-gray-900">Merge Customers</h2>
          <button
            type="button"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border-2 border-blue-600 bg-white text-red-500 hover:bg-red-50"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm text-gray-700">
            Select a customer profile with whom you'd like to merge{" "}
            <strong>{currentCustomerName}</strong>. Once merged, the transactions of{" "}
            <strong>{currentCustomerName}</strong> will be transferred, and this customer
            record will be marked as inactive.
          </p>
          <div className="relative" ref={mergeCustomerDropdownRef}>
            <div
              className="flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 transition-colors hover:border-gray-400"
              onClick={onToggleDropdown}
            >
              <span className={mergeTargetCustomer ? "text-gray-700" : "text-gray-400"}>
                {mergeTargetCustomer
                  ? mergeTargetCustomer.name || mergeTargetCustomer.displayName
                  : "Select Customer"}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform ${
                  isMergeCustomerDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
            {isMergeCustomerDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-[1002] mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-200 px-3.5 py-2.5">
                  <Search size={16} className="shrink-0 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={mergeCustomerSearch}
                    onChange={(event) => onSearchChange(event.target.value)}
                    autoFocus
                    className="flex-1 border-none text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredMergeCustomers.length > 0 ? (
                    filteredMergeCustomers.map((customer, index) => {
                      const optionId = String(customer.id || customer._id || index);
                      const isSelected =
                        String(mergeTargetCustomer?.id || mergeTargetCustomer?._id || "") === optionId;

                      return (
                        <div
                          key={`${optionId}-${index}`}
                          className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => onSelectCustomer(customer)}
                        >
                          {customer.name || customer.displayName}{" "}
                          {customer.companyName ? `(${customer.companyName})` : ""}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm text-gray-500">No customers found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            className="cursor-pointer rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            onClick={onSubmit}
          >
            Continue
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerAssociateTemplatesModal({
  isOpen,
  pdfTemplates,
  onClose,
  onSave,
  onTemplateSelect,
  onCreateNewTemplate,
}: AssociateTemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Associate Templates</h2>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-red-500 p-1 text-red-600 hover:bg-red-50"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-gray-600">Associate PDF templates to this customer.</p>

          <div className="mb-6 border-b border-gray-200 pb-4 last:border-b-0">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">PDF Templates</h3>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                onClick={onCreateNewTemplate}
              >
                <Plus size={16} />
                New PDF Template
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-700">Customer Statement</label>
                <select
                  className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  value={pdfTemplates.customerStatement}
                  onChange={(event) =>
                    onTemplateSelect("pdf", "customerStatement", event.target.value)
                  }
                >
                  {PDF_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-700">Quotes</label>
                <select
                  className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  value={pdfTemplates.quotes}
                  onChange={(event) => onTemplateSelect("pdf", "quotes", event.target.value)}
                >
                  {PDF_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-700">Invoices</label>
                <select
                  className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  value={pdfTemplates.invoices}
                  onChange={(event) => onTemplateSelect("pdf", "invoices", event.target.value)}
                >
                  {PDF_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-700">Credit Notes</label>
                <select
                  className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  value={pdfTemplates.creditNotes}
                  onChange={(event) =>
                    onTemplateSelect("pdf", "creditNotes", event.target.value)
                  }
                >
                  {PDF_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-700">Payment Thank You</label>
                <select
                  className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  value={pdfTemplates.paymentThankYou}
                  onChange={(event) =>
                    onTemplateSelect("pdf", "paymentThankYou", event.target.value)
                  }
                >
                  {PDF_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
          <button
            type="button"
            className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
            onClick={onSave}
          >
            Save
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerCloneModal({
  isOpen,
  cloneContactType,
  isCloning,
  onClose,
  onTypeChange,
  onProceed,
}: CloneModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="customer-detail-clone-modal mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <p className="mb-6 text-sm text-gray-600">
            Select the contact type under which you want to create the new cloned contact.
          </p>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-4 hover:bg-gray-50">
              <input
                type="radio"
                name="cloneContactType"
                value="customer"
                checked={cloneContactType === "customer"}
                onChange={(event) => onTypeChange(event.target.value)}
              />
              <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Customer</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-4 hover:bg-gray-50">
              <input
                type="radio"
                name="cloneContactType"
                value="vendor"
                checked={cloneContactType === "vendor"}
                onChange={(event) => onTypeChange(event.target.value)}
              />
              <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Vendor</span>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
          <button
            type="button"
            className={`flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
              isCloning ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
            onClick={onProceed}
            disabled={isCloning}
          >
            {isCloning && <Loader2 size={14} className="animate-spin" />}
            {isCloning ? "Cloning..." : "Proceed"}
          </button>
          <button
            type="button"
            className={`rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
              isCloning ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
            onClick={onClose}
            disabled={isCloning}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerInviteModal({
  isOpen,
  inviteMethod,
  emailValue,
  isSendingInvitation,
  onClose,
  onInviteMethodChange,
  onInviteEmailChange,
  onWhatsAppShare,
  onFacebookShare,
  onTwitterShare,
  onLinkedInShare,
  onCopyInvitationLink,
  onSendInvitation,
}: InviteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Invite Customer</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Invite Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onInviteMethodChange("email")}
                className={`cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  inviteMethod === "email"
                    ? "text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={inviteMethod === "email" ? { backgroundColor: "#156372" } : {}}
              >
                <Mail size={16} className="mr-2 inline" />
                Email
              </button>
              <button
                type="button"
                onClick={() => onInviteMethodChange("social")}
                className={`cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  inviteMethod === "social"
                    ? "text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={inviteMethod === "social" ? { backgroundColor: "#156372" } : {}}
              >
                <UserPlus size={16} className="mr-2 inline" />
                Social
              </button>
            </div>
          </div>

          {inviteMethod === "email" && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={emailValue}
                onChange={(event) => onInviteEmailChange(event.target.value)}
                placeholder="Enter email address"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "#156372" } as React.CSSProperties}
              />
              <p className="mt-2 text-xs text-gray-500">
                An invitation email will be sent to this address
              </p>
            </div>
          )}

          {inviteMethod === "social" && (
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Share via Social Media & Messaging
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onWhatsAppShare}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <span className="text-lg">WhatsApp</span>
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onFacebookShare}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <span className="text-lg">Facebook</span>
                  <span>Share on Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={onTwitterShare}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600"
                >
                  <span className="text-lg">Twitter</span>
                  <span>Share on Twitter</span>
                </button>
                <button
                  type="button"
                  onClick={onLinkedInShare}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800"
                >
                  <span className="text-lg">LinkedIn</span>
                  <span>Share on LinkedIn</span>
                </button>
                <button
                  type="button"
                  onClick={onCopyInvitationLink}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <span className="text-lg">Copy</span>
                  <span>Copy Invitation Link</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md bg-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
            >
              Cancel
            </button>
            {inviteMethod === "email" && (
              <button
                type="button"
                onClick={onSendInvitation}
                disabled={isSendingInvitation}
                className={`rounded-md px-6 py-2.5 text-sm font-medium text-white transition-all ${
                  isSendingInvitation ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                }`}
                style={{ backgroundColor: "#156372" }}
              >
                {isSendingInvitation ? "Sending..." : "Send Invitation"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
