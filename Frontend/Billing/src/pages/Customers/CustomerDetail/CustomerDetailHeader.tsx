import React from "react";
import { ChevronDown, Edit, Paperclip, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import CustomerDetailMoreMenu from "./CustomerDetailMoreMenu";

export default function CustomerDetailHeader(args: any) {
  const {
    customer,
    id,
    attachments,
    navigate,
    setIsDeleteModalOpen,
    isAttachmentsDropdownOpen,
    setIsAttachmentsDropdownOpen,
    attachmentsDropdownRef,
    isUploadingAttachments,
    handleFileUpload,
    handleRemoveAttachment,
    newTransactionDropdownRef,
    isNewTransactionDropdownOpen,
    setIsNewTransactionDropdownOpen,
    moreDropdownRef,
    isMoreDropdownOpen,
    setIsMoreDropdownOpen,
    areRemindersStopped,
    setAreRemindersStopped,
    handleAssociateTemplates,
    setIsConfigurePortalModalOpen,
    setPortalAccessContacts,
    handleClone,
    handleMergeCustomers,
    setActiveStatus,
    setShowActionHeader,
    isCustomerActive,
    activeTab,
    setActiveTab,
    selectedTransactionType,
    openTransactionSection,
    CustomerAttachmentsPopover,
  } = args;

  return (
    <div className="sticky top-0 z-30 bg-white">
      {!isCustomerActive(customer) ? (
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {customer?.name || customer?.displayName || customer?.companyName || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Customer"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50" onClick={async () => { await setActiveStatus(true); }}>
              Mark as Active
            </button>
            <div className="flex h-[38px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700">
              <Paperclip size={14} />
              {attachments.length}
            </div>
            <button
              className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => {
                setIsMoreDropdownOpen(false);
                setIsDeleteModalOpen(true);
              }}
            >
              Delete
            </button>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => navigate("/sales/customers")}
              title="Back to Customers List"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {customer?.name || customer?.displayName || customer?.companyName || `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Customer"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/sales/customers/${id}/edit`)}
              className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border-b-[4px] border-[#0D4A52] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
              style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
            >
              <Edit size={16} />
              Edit
            </button>
            <div className="relative" ref={attachmentsDropdownRef}>
              <button
                className="flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1 rounded border border-gray-200 bg-white px-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setIsAttachmentsDropdownOpen((previous: boolean) => !previous)}
                aria-label="Attachments"
                title="Attachments"
              >
                <Paperclip size={14} strokeWidth={2} />
                <span className="text-[12px] font-medium leading-none">{attachments.length}</span>
              </button>
              <CustomerAttachmentsPopover
                open={isAttachmentsDropdownOpen}
                onClose={() => setIsAttachmentsDropdownOpen(false)}
                attachments={attachments}
                isUploading={isUploadingAttachments}
                onUpload={handleFileUpload}
                onRemoveAttachment={handleRemoveAttachment}
              />
            </div>

            <div className="relative inline-flex" ref={newTransactionDropdownRef}>
              <div className="flex items-center">
                <button
                  className="flex h-[38px] min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-l-lg border-b-[4px] border-[#0D4A52] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
                  style={{ background: "linear-gradient(180deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={() => setIsNewTransactionDropdownOpen(!isNewTransactionDropdownOpen)}
                >
                  <Plus size={16} />
                  New Transaction
                </button>
                <button
                  className="flex h-[38px] w-10 cursor-pointer items-center justify-center rounded-r-lg border-b-[4px] border-l border-[#0B3A41] border-white/20 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:brightness-110 active:translate-y-[1px] active:border-b-[2px]"
                  style={{ background: "#0D4A52" }}
                  onClick={() => setIsNewTransactionDropdownOpen(!isNewTransactionDropdownOpen)}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {isNewTransactionDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-[360px] w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">SALES</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/subscriptions/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Subscription</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/invoices/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Invoice</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/payments/payments-received/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Customer Payment</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/payments/payment-links/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Payment Link</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/quotes/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Quote</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/quotes/subscription/new", { state: { customerId: customer?.id, customerName: customer?.name, forSubscription: true } }); }}>Quote for Subscription</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/retainer-invoices/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Retainer Invoice</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/recurring-invoices/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Recurring Invoice</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/purchases/expenses/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Expense</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/expenses/recurring-expenses/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Recurring Expense</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/accountant/manual-journals/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Journal</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/credit-notes/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Credit Note</div>
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/sales/sales-receipts/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Sales Receipt</div>
                  <div className="my-1 h-px bg-gray-200" />
                  <div className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsNewTransactionDropdownOpen(false); navigate("/projects/new", { state: { customerId: customer?.id, customerName: customer?.name } }); }}>Project</div>
                </div>
              )}
            </div>

            <CustomerDetailMoreMenu
              moreDropdownRef={moreDropdownRef}
              isMoreDropdownOpen={isMoreDropdownOpen}
              areRemindersStopped={areRemindersStopped}
              isCustomerActive={isCustomerActive(customer)}
              onToggle={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              onAssociateTemplates={handleAssociateTemplates}
              onConfigurePortal={() => {
                setIsMoreDropdownOpen(false);
                const contacts = customer.contactPersons?.map((contact: any) => ({
                  id: contact.id || Date.now() + Math.random(),
                  name: `${contact.salutation ? `${contact.salutation}. ` : ""}${contact.firstName} ${contact.lastName}`,
                  email: contact.email || "",
                  hasAccess: contact.hasPortalAccess || false,
                })) || [];
                if (contacts.length === 0 && customer.name) {
                  contacts.push({
                    id: "customer-main",
                    name: customer.name,
                    email: customer.email || "",
                    hasAccess: customer.enablePortal || false,
                  });
                }
                setPortalAccessContacts(contacts);
                setIsConfigurePortalModalOpen(true);
              }}
              onToggleReminders={() => {
                setIsMoreDropdownOpen(false);
                setAreRemindersStopped(!areRemindersStopped);
                toast.success(!areRemindersStopped ? "All reminders stopped for this customer" : "All reminders enabled for this customer");
              }}
              onClone={handleClone}
              onMergeCustomers={handleMergeCustomers}
              onToggleActive={async () => {
                setIsMoreDropdownOpen(false);
                const isCurrentlyActive = isCustomerActive(customer);
                await setActiveStatus(!isCurrentlyActive);
                setShowActionHeader(true);
              }}
              onDelete={() => {
                setIsMoreDropdownOpen(false);
                setIsDeleteModalOpen(true);
              }}
            />

            <button
              onClick={() => navigate("/sales/customers")}
              className="flex h-[38px] cursor-pointer items-center gap-2 rounded-lg border border-gray-300 border-b-[4px] bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-[1px] hover:border-b-[6px] hover:bg-gray-50 active:translate-y-[1px] active:border-b-[2px]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-0 flex gap-6 border-b border-gray-200 bg-white px-1">
        <button className={`-mb-px cursor-pointer border-b-2 px-2.5 py-3 text-[13px] font-bold transition-colors ${activeTab === "overview" ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={`-mb-px cursor-pointer border-b-2 px-2.5 py-3 text-[13px] font-bold transition-colors ${activeTab === "comments" ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`} onClick={() => setActiveTab("comments")}>Comments</button>
        <button
          className={`-mb-px cursor-pointer border-b-2 px-2.5 py-3 text-[13px] font-bold transition-colors ${activeTab === "transactions" ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          onClick={() => {
            setActiveTab("transactions");
            if (!selectedTransactionType) {
              openTransactionSection("subscriptions");
            }
          }}
        >
          Transactions
        </button>
        {customer?.linkedVendorId && (
          <button className={`-mb-px cursor-pointer border-b-2 px-2.5 py-3 text-[13px] font-bold transition-colors ${activeTab === "purchases" ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`} onClick={() => setActiveTab("purchases")}>
            Purchases
          </button>
        )}
        <button className={`-mb-px cursor-pointer border-b-2 px-2.5 py-3 text-[13px] font-bold transition-colors ${activeTab === "mails" ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`} onClick={() => setActiveTab("mails")}>Mails</button>
        <button className={`-mb-px cursor-pointer border-b-2 px-2.5 py-3 text-[13px] font-bold transition-colors ${activeTab === "statement" ? "border-[#156372] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`} onClick={() => setActiveTab("statement")}>Statement</button>
      </div>
    </div>
  );
}
