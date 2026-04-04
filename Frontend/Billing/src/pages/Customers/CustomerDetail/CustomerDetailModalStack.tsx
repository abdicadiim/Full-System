import React from "react";
import { toast } from "react-toastify";
import { customersAPI, vendorsAPI } from "../../../services/api";
import CustomerPortalAccessModal from "./CustomerPortalAccessModal";
import CustomerLinkVendorModal from "./CustomerLinkVendorModal";
import CustomerConsolidatedBillingModal from "./CustomerConsolidatedBillingModal";
import CustomerContactPersonModal from "./CustomerContactPersonModal";
import CustomerReportingTagsModal from "./CustomerReportingTagsModal";
import CustomerAddressModal from "./CustomerAddressModal";
import { CustomerEmailIntegrationModal } from "./CustomerEmailIntegrationModals";
import {
  CustomerDeleteConfirmationModal,
  CustomerDeleteContactPersonModal,
} from "./CustomerDeleteModals";
import {
  CustomerAssociateTemplatesModal,
  CustomerCloneModal,
  CustomerInviteModal,
  CustomerMergeModal,
  CustomerPrintStatementsModal,
} from "./CustomerDetailModals";

export default function CustomerDetailModalStack(args: any) {
  const {
    isPrintStatementsModalOpen,
    startDatePickerRef,
    endDatePickerRef,
    printStatementStartDate,
    printStatementEndDate,
    isStartDatePickerOpen,
    isEndDatePickerOpen,
    startDateCalendarMonth,
    endDateCalendarMonth,
    setIsPrintStatementsModalOpen,
    handlePrintStatementsSubmit,
    setIsStartDatePickerOpen,
    setIsEndDatePickerOpen,
    setPrintStatementStartDate,
    setPrintStatementEndDate,
    setStartDateCalendarMonth,
    setEndDateCalendarMonth,
    formatDateForDisplay,
    isMergeModalOpen,
    customer,
    displayName,
    mergeTargetCustomer,
    isMergeCustomerDropdownOpen,
    mergeCustomerSearch,
    filteredMergeCustomers,
    mergeCustomerDropdownRef,
    setIsMergeModalOpen,
    setMergeTargetCustomer,
    setMergeCustomerSearch,
    setIsMergeCustomerDropdownOpen,
    handleMergeSubmit,
    isAssociateTemplatesModalOpen,
    pdfTemplates,
    setIsAssociateTemplatesModalOpen,
    handleAssociateTemplatesSave,
    handleTemplateSelect,
    navigate,
    isCloneModalOpen,
    cloneContactType,
    isCloning,
    setIsCloneModalOpen,
    setCloneContactType,
    handleCloneSubmit,
    isConfigurePortalModalOpen,
    portalAccessContacts,
    setPortalAccessContacts,
    setIsConfigurePortalModalOpen,
    setCustomer,
    isLinkToVendorModalOpen,
    selectedVendor,
    vendorSearch,
    vendors,
    isVendorDropdownOpen,
    vendorDropdownRef,
    setIsLinkToVendorModalOpen,
    setSelectedVendor,
    setVendorSearch,
    setIsVendorDropdownOpen,
    refreshData,
    bulkConsolidatedAction,
    isBulkConsolidatedUpdating,
    setBulkConsolidatedAction,
    confirmSidebarBulkConsolidatedBilling,
    isAddContactPersonModalOpen,
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
    setIsAddContactPersonModalOpen,
    resetContactPersonModal,
    saveContactPerson,
    isAssociateTagsModalOpen,
    availableReportingTags,
    associateTagsValues,
    setAssociateTagsValues,
    isSavingAssociateTags,
    closeAssociateTagsModal,
    handleSaveAssociateTags,
    showAddressModal,
    addressType,
    addressFormData,
    setAddressFormData,
    setShowAddressModal,
    id,
    normalizeComments,
    isOutlookIntegrationModalOpen,
    setIsOutlookIntegrationModalOpen,
    isZohoMailIntegrationModalOpen,
    setIsZohoMailIntegrationModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleteContactPersonModalOpen,
    setIsDeleteContactPersonModalOpen,
    setPendingDeleteContactPersonIndex,
    pendingDeleteContactPersonIndex,
    deleteContactPerson,
    isInviteModalOpen,
    inviteMethod,
    getInviteEmailValue,
    isSendingInvitation,
    closeInviteModal,
    setInviteMethod,
    setInviteEmail,
    handleInviteWhatsAppShare,
    handleInviteFacebookShare,
    handleInviteTwitterShare,
    handleInviteLinkedInShare,
    handleCopyInvitationLink,
    handleSendInvitation,
  } = args;

  return (
    <>
      <CustomerPrintStatementsModal
        isOpen={isPrintStatementsModalOpen}
        startDatePickerRef={startDatePickerRef}
        endDatePickerRef={endDatePickerRef}
        printStatementStartDate={printStatementStartDate}
        printStatementEndDate={printStatementEndDate}
        isStartDatePickerOpen={isStartDatePickerOpen}
        isEndDatePickerOpen={isEndDatePickerOpen}
        startDateCalendarMonth={startDateCalendarMonth}
        endDateCalendarMonth={endDateCalendarMonth}
        onClose={() => setIsPrintStatementsModalOpen(false)}
        onSubmit={handlePrintStatementsSubmit}
        onToggleStartDatePicker={() => {
          setIsStartDatePickerOpen(!isStartDatePickerOpen);
          setIsEndDatePickerOpen(false);
        }}
        onToggleEndDatePicker={() => {
          setIsEndDatePickerOpen(!isEndDatePickerOpen);
          setIsStartDatePickerOpen(false);
        }}
        onStartDateChange={(date) => {
          setPrintStatementStartDate(date);
          setIsStartDatePickerOpen(false);
        }}
        onEndDateChange={(date) => {
          setPrintStatementEndDate(date);
          setIsEndDatePickerOpen(false);
        }}
        onPrevStartMonth={() =>
          setStartDateCalendarMonth(new Date(startDateCalendarMonth.getFullYear(), startDateCalendarMonth.getMonth() - 1, 1))
        }
        onNextStartMonth={() =>
          setStartDateCalendarMonth(new Date(startDateCalendarMonth.getFullYear(), startDateCalendarMonth.getMonth() + 1, 1))
        }
        onPrevEndMonth={() =>
          setEndDateCalendarMonth(new Date(endDateCalendarMonth.getFullYear(), endDateCalendarMonth.getMonth() - 1, 1))
        }
        onNextEndMonth={() =>
          setEndDateCalendarMonth(new Date(endDateCalendarMonth.getFullYear(), endDateCalendarMonth.getMonth() + 1, 1))
        }
        formatDateForDisplay={formatDateForDisplay}
      />

      <CustomerMergeModal
        isOpen={isMergeModalOpen}
        currentCustomerName={customer?.name || customer?.displayName || displayName}
        mergeTargetCustomer={mergeTargetCustomer}
        isMergeCustomerDropdownOpen={isMergeCustomerDropdownOpen}
        mergeCustomerSearch={mergeCustomerSearch}
        filteredMergeCustomers={filteredMergeCustomers}
        mergeCustomerDropdownRef={mergeCustomerDropdownRef}
        onClose={() => {
          setIsMergeModalOpen(false);
          setMergeTargetCustomer(null);
          setMergeCustomerSearch("");
        }}
        onToggleDropdown={() => {
          setIsMergeCustomerDropdownOpen(!isMergeCustomerDropdownOpen);
          setMergeCustomerSearch("");
        }}
        onSearchChange={setMergeCustomerSearch}
        onSelectCustomer={(selectedCustomer) => {
          setMergeTargetCustomer(selectedCustomer);
          setIsMergeCustomerDropdownOpen(false);
          setMergeCustomerSearch("");
        }}
        onSubmit={handleMergeSubmit}
      />

      <CustomerAssociateTemplatesModal
        isOpen={isAssociateTemplatesModalOpen}
        pdfTemplates={pdfTemplates}
        onClose={() => setIsAssociateTemplatesModalOpen(false)}
        onSave={handleAssociateTemplatesSave}
        onTemplateSelect={handleTemplateSelect}
        onCreateNewTemplate={() => navigate("/settings/customization/pdf-templates")}
      />

      <CustomerCloneModal
        isOpen={isCloneModalOpen}
        cloneContactType={cloneContactType}
        isCloning={isCloning}
        onClose={() => setIsCloneModalOpen(false)}
        onTypeChange={setCloneContactType}
        onProceed={() => handleCloneSubmit()}
      />

      <CustomerPortalAccessModal
        isOpen={isConfigurePortalModalOpen}
        portalAccessContacts={portalAccessContacts}
        setPortalAccessContacts={setPortalAccessContacts}
        onClose={() => setIsConfigurePortalModalOpen(false)}
        onSave={async () => {
          if (customer) {
            const updatedContactPersons =
              customer.contactPersons?.map((contact: any) => {
                const portalContact = portalAccessContacts.find((pc: any) =>
                  pc.name.includes(contact.firstName) && pc.name.includes(contact.lastName),
                );
                return portalContact
                  ? { ...contact, hasPortalAccess: portalContact.hasAccess, email: portalContact.email || contact.email }
                  : contact;
              }) || [];

            let nextCustomer = customer;

            if ((!customer.contactPersons || customer.contactPersons.length === 0) && portalAccessContacts.length > 0) {
              const mainContact = portalAccessContacts[0];
              if (mainContact.id === "customer-main") {
                try {
                  nextCustomer = {
                    ...customer,
                    enablePortal: mainContact.hasAccess,
                    email: mainContact.email || customer.email,
                  };
                  const response = await customersAPI.update(customer.id, nextCustomer);
                  setCustomer(response?.data || nextCustomer);
                } catch (error: any) {
                  toast.error("Failed to update customer: " + (error.message || "Unknown error"));
                  return;
                }
              }
            } else {
              try {
                nextCustomer = {
                  ...customer,
                  contactPersons: updatedContactPersons,
                  enablePortal: portalAccessContacts.some((contact: any) => contact.hasAccess),
                };
                const response = await customersAPI.update(customer.id, nextCustomer);
                setCustomer(response?.data || nextCustomer);
              } catch (error: any) {
                toast.error("Failed to update customer: " + (error.message || "Unknown error"));
                return;
              }
            }

            args.setIsConfigurePortalModalOpen(false);
            toast.success("Portal access updated successfully.");
            void refreshData();
          }
        }}
      />

      <CustomerLinkVendorModal
        isOpen={isLinkToVendorModalOpen}
        customerName={customer?.name || customer?.displayName || "Customer"}
        selectedVendor={selectedVendor}
        vendorSearch={vendorSearch}
        vendors={vendors}
        isVendorDropdownOpen={isVendorDropdownOpen}
        vendorDropdownRef={vendorDropdownRef}
        onClose={() => {
          setIsLinkToVendorModalOpen(false);
          setSelectedVendor(null);
          setVendorSearch("");
        }}
        onToggleDropdown={() => setIsVendorDropdownOpen(!isVendorDropdownOpen)}
        onVendorSearchChange={setVendorSearch}
        onSelectVendor={(vendor) => {
          setSelectedVendor(vendor);
          setIsVendorDropdownOpen(false);
          setVendorSearch("");
        }}
        onConfirm={async () => {
          if (selectedVendor && customer) {
            const vendorName =
              selectedVendor.name ||
              selectedVendor.formData?.displayName ||
              selectedVendor.formData?.companyName ||
              selectedVendor.formData?.vendorName ||
              "";
            const customerId = String(customer.id || customer._id || "");
            const selectedVendorId = String(selectedVendor.id || selectedVendor._id || "");
            const previousLinkedVendorId = String(customer.linkedVendorId || "").trim();
            try {
              await customersAPI.update(customerId, {
                ...customer,
                linkedVendorId: selectedVendorId,
                linkedVendorName: vendorName,
              });

              await vendorsAPI.update(selectedVendorId, {
                linkedCustomerId: customerId,
                linkedCustomerName: customer.name || customer.displayName || "",
              });

              if (previousLinkedVendorId && previousLinkedVendorId !== selectedVendorId) {
                try {
                  await vendorsAPI.update(previousLinkedVendorId, {
                    linkedCustomerId: null,
                    linkedCustomerName: null,
                  });
                } catch {
                }
              }
            } catch (error: any) {
              toast.error("Failed to update customer: " + (error.message || "Unknown error"));
              return;
            }

            setCustomer({
              ...customer,
              linkedVendorId: selectedVendorId,
              linkedVendorName: vendorName,
            });
            if (args.setLinkedVendor) {
              args.setLinkedVendor(selectedVendor);
            }
            setIsLinkToVendorModalOpen(false);
            setSelectedVendor(null);
            setVendorSearch("");
            toast.success(`Customer "${customer.name || customer.displayName}" has been linked to vendor "${vendorName}"`);
            void refreshData();
          }
        }}
      />

      <CustomerConsolidatedBillingModal
        bulkConsolidatedAction={bulkConsolidatedAction}
        isBulkConsolidatedUpdating={isBulkConsolidatedUpdating}
        onClose={() => setBulkConsolidatedAction(null)}
        onConfirm={confirmSidebarBulkConsolidatedBilling}
      />

      <CustomerContactPersonModal
        isOpen={isAddContactPersonModalOpen}
        editingContactPersonIndex={editingContactPersonIndex}
        newContactPerson={newContactPerson}
        setNewContactPerson={setNewContactPerson}
        contactPersonWorkPhoneCode={contactPersonWorkPhoneCode}
        setContactPersonWorkPhoneCode={setContactPersonWorkPhoneCode}
        contactPersonMobilePhoneCode={contactPersonMobilePhoneCode}
        setContactPersonMobilePhoneCode={setContactPersonMobilePhoneCode}
        contactPersonProfilePreview={contactPersonProfilePreview}
        setContactPersonProfilePreview={setContactPersonProfilePreview}
        contactPersonProfileInputRef={contactPersonProfileInputRef}
        handleContactPersonProfileFile={handleContactPersonProfileFile}
        isSavingContactPerson={isSavingContactPerson}
        onClose={() => {
          setIsAddContactPersonModalOpen(false);
          resetContactPersonModal();
        }}
        onSave={saveContactPerson}
      />

      <CustomerReportingTagsModal
        isOpen={isAssociateTagsModalOpen}
        availableReportingTags={availableReportingTags}
        associateTagsValues={associateTagsValues}
        setAssociateTagsValues={setAssociateTagsValues}
        isSavingAssociateTags={isSavingAssociateTags}
        onClose={closeAssociateTagsModal}
        onSave={handleSaveAssociateTags}
      />

      <CustomerAddressModal
        isOpen={showAddressModal}
        addressType={addressType}
        addressFormData={addressFormData}
        setAddressFormData={setAddressFormData}
        onClose={() => setShowAddressModal(false)}
        onSave={async () => {
          if (!customer || !id) return;

          const updatedCustomer = { ...customer };
          if (addressType === "billing") {
            updatedCustomer.billingAddress = {
              attention: addressFormData.attention || "",
              country: addressFormData.country || "",
              street1: addressFormData.addressLine1 || "",
              street2: addressFormData.addressLine2 || "",
              city: addressFormData.city || "",
              state: addressFormData.state || "",
              zipCode: addressFormData.zipCode || "",
              phone: addressFormData.phone || "",
              fax: addressFormData.faxNumber || "",
            };
            updatedCustomer.billingAttention = addressFormData.attention;
            updatedCustomer.billingCountry = addressFormData.country;
            updatedCustomer.billingStreet1 = addressFormData.addressLine1;
            updatedCustomer.billingStreet2 = addressFormData.addressLine2;
            updatedCustomer.billingCity = addressFormData.city;
            updatedCustomer.billingState = addressFormData.state;
            updatedCustomer.billingZipCode = addressFormData.zipCode;
            updatedCustomer.billingPhone = addressFormData.phone;
            updatedCustomer.billingFax = addressFormData.faxNumber;
          } else {
            updatedCustomer.shippingAddress = {
              attention: addressFormData.attention || "",
              country: addressFormData.country || "",
              street1: addressFormData.addressLine1 || "",
              street2: addressFormData.addressLine2 || "",
              city: addressFormData.city || "",
              state: addressFormData.state || "",
              zipCode: addressFormData.zipCode || "",
              phone: addressFormData.phone || "",
              fax: addressFormData.faxNumber || "",
            };
            updatedCustomer.shippingAttention = addressFormData.attention;
            updatedCustomer.shippingCountry = addressFormData.country;
            updatedCustomer.shippingStreet1 = addressFormData.addressLine1;
            updatedCustomer.shippingStreet2 = addressFormData.addressLine2;
            updatedCustomer.shippingCity = addressFormData.city;
            updatedCustomer.shippingState = addressFormData.state;
            updatedCustomer.shippingZipCode = addressFormData.zipCode;
            updatedCustomer.shippingPhone = addressFormData.phone;
            updatedCustomer.shippingFax = addressFormData.faxNumber;
          }

          try {
            const response = await customersAPI.update(id, updatedCustomer);
            const persistedCustomer = response?.data || updatedCustomer;
            if (persistedCustomer) {
              const normalizedComments = normalizeComments(persistedCustomer.comments);
              setCustomer({
                ...persistedCustomer,
                billingStreet1: persistedCustomer.billingAddress?.street1 || persistedCustomer.billingStreet1 || "",
                billingStreet2: persistedCustomer.billingAddress?.street2 || persistedCustomer.billingStreet2 || "",
                billingCity: persistedCustomer.billingAddress?.city || persistedCustomer.billingCity || "",
                billingState: persistedCustomer.billingAddress?.state || persistedCustomer.billingState || "",
                billingZipCode: persistedCustomer.billingAddress?.zipCode || persistedCustomer.billingZipCode || "",
                billingPhone: persistedCustomer.billingAddress?.phone || persistedCustomer.billingPhone || "",
                billingFax: persistedCustomer.billingAddress?.fax || persistedCustomer.billingFax || "",
                billingAttention: persistedCustomer.billingAddress?.attention || persistedCustomer.billingAttention || "",
                billingCountry: persistedCustomer.billingAddress?.country || persistedCustomer.billingCountry || "",
                shippingStreet1: persistedCustomer.shippingAddress?.street1 || persistedCustomer.shippingStreet1 || "",
                shippingStreet2: persistedCustomer.shippingAddress?.street2 || persistedCustomer.shippingStreet2 || "",
                shippingCity: persistedCustomer.shippingAddress?.city || persistedCustomer.shippingCity || "",
                shippingState: persistedCustomer.shippingAddress?.state || persistedCustomer.shippingState || "",
                shippingZipCode: persistedCustomer.shippingAddress?.zipCode || persistedCustomer.shippingZipCode || "",
                shippingPhone: persistedCustomer.shippingAddress?.phone || persistedCustomer.shippingPhone || "",
                shippingFax: persistedCustomer.shippingAddress?.fax || persistedCustomer.shippingFax || "",
                shippingAttention: persistedCustomer.shippingAddress?.attention || persistedCustomer.shippingAttention || "",
                shippingCountry: persistedCustomer.shippingAddress?.country || persistedCustomer.shippingCountry || "",
                comments: normalizedComments,
              });
              args.setComments(normalizedComments);
            }
            setShowAddressModal(false);
            toast.success(`${addressType === "billing" ? "Billing" : "Shipping"} address saved successfully`);
            void refreshData();
          } catch (error: any) {
            toast.error("Failed to update address: " + (error.message || "Unknown error"));
            return;
          }
        }}
      />

      <CustomerEmailIntegrationModal
        provider="outlook"
        isOpen={isOutlookIntegrationModalOpen}
        onClose={() => setIsOutlookIntegrationModalOpen(false)}
        onEnable={() => {
          setIsOutlookIntegrationModalOpen(false);
          toast.success("Outlook integration enabled!");
        }}
      />

      <CustomerEmailIntegrationModal
        provider="zoho"
        isOpen={isZohoMailIntegrationModalOpen}
        onClose={() => setIsZohoMailIntegrationModalOpen(false)}
        onEnable={() => {
          setIsZohoMailIntegrationModalOpen(false);
          toast.success("Zoho Mail integration enabled!");
        }}
      />

      <CustomerDeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          try {
            await customersAPI.delete(id);
            setIsDeleteModalOpen(false);
            navigate("/sales/customers");
            toast.success("Customer deleted successfully");
          } catch (error: any) {
            toast.error("Failed to delete customer: " + (error?.message || "Unknown error"));
          }
        }}
      />

      <CustomerDeleteContactPersonModal
        isOpen={isDeleteContactPersonModalOpen}
        onClose={() => {
          setIsDeleteContactPersonModalOpen(false);
          setPendingDeleteContactPersonIndex(null);
        }}
        onConfirm={async () => {
          if (pendingDeleteContactPersonIndex === null) return;
          await deleteContactPerson(pendingDeleteContactPersonIndex);
          setIsDeleteContactPersonModalOpen(false);
          setPendingDeleteContactPersonIndex(null);
        }}
      />

      <CustomerInviteModal
        isOpen={isInviteModalOpen}
        inviteMethod={inviteMethod}
        emailValue={getInviteEmailValue()}
        isSendingInvitation={isSendingInvitation}
        onClose={closeInviteModal}
        onInviteMethodChange={setInviteMethod}
        onInviteEmailChange={setInviteEmail}
        onWhatsAppShare={handleInviteWhatsAppShare}
        onFacebookShare={handleInviteFacebookShare}
        onTwitterShare={handleInviteTwitterShare}
        onLinkedInShare={handleInviteLinkedInShare}
        onCopyInvitationLink={handleCopyInvitationLink}
        onSendInvitation={handleSendInvitation}
      />
    </>
  );
}
