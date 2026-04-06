import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import NewTaxModal from "../../../../components/modals/NewTaxModal";
import CustomerPrimaryInfoSection from "./CustomerPrimaryInfoSection";
import OtherDetailsSection from "./OtherDetailsSection";
import AddressSection from "./AddressSection";
import ContactPersonsSection from "./ContactPersonsSection";
import CustomFieldsSection from "./CustomFieldsSection";
import RemarksSection from "./RemarksSection";
import CustomerNumberSettingsModal from "./CustomerNumberSettingsModal";
import { createDefaultContactPerson } from "./NewCustomer.constants";

type Props = {
  controller: any;
};

export default function NewCustomerView({ controller }: Props) {
  const {
    id,
    isEditMode,
    isSaving,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    errors,
    setErrors,
    isDisplayNameManuallyEdited,
    setIsDisplayNameManuallyEdited,
    setIsCustomerNumberManuallyEdited,
    availableCurrencies,
    baseCurrency,
    availableTaxes,
    paymentTermsList,
    setPaymentTermsList,
    customerNumberPrefix,
    setCustomerNumberPrefix,
    customerNumberStart,
    setCustomerNumberStart,
    isSavingSettings,
    handleChange,
    handleSave,
    handleCancel,
    handleSaveCustomerNumberSettings,
    loadTaxes,
  } = controller;

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [configureTermsOpen, setConfigureTermsOpen] = useState(false);
  const [isCustomerNumberSettingsModalOpen, setIsCustomerNumberSettingsModalOpen] = useState(false);
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);

  const openCustomerNumberSettings = () => setIsCustomerNumberSettingsModalOpen(true);
  const openTaxModal = () => setIsNewTaxModalOpen(true);
  const tabs = [
    { id: "other-details", label: "Other Details" },
    { id: "address", label: "Address" },
    { id: "contact-persons", label: "Contact Persons" },
    { id: "custom-fields", label: "Custom Fields" },
    { id: "remarks", label: "Remarks" },
  ] as const;

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-white overflow-x-hidden">
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 m-0 whitespace-nowrap">
          {isEditMode ? "Edit Customer" : "New Customer"}
        </h1>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div data-new-customer-scroll className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative bg-white">
          <div className="w-full max-w-none px-4 sm:px-6 py-5 sm:py-8 overflow-x-hidden">
            <div className="space-y-6">
              <CustomerPrimaryInfoSection
                formData={formData}
                errors={errors}
                availableCurrencies={availableCurrencies}
                baseCurrency={baseCurrency}
                isDisplayNameManuallyEdited={isDisplayNameManuallyEdited}
                setFormData={setFormData}
                setErrors={setErrors}
                setIsDisplayNameManuallyEdited={setIsDisplayNameManuallyEdited}
                setIsCustomerNumberManuallyEdited={setIsCustomerNumberManuallyEdited}
                handleChange={handleChange}
                onOpenCustomerNumberSettings={openCustomerNumberSettings}
              />

              <div className="flex gap-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`shrink-0 px-4 py-2.5 text-[13px] transition-all border-b-2 font-medium ${
                      activeTab === tab.id ? "text-[#156372] border-[#156372]" : "text-gray-500 hover:text-gray-700 border-transparent"
                    }`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "contact-persons" && formData.contactPersons.length === 0) {
                        setFormData((prev) => ({ ...prev, contactPersons: [createDefaultContactPerson()] }));
                      }
                    }}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div>
                {activeTab === "other-details" && (
                  <OtherDetailsSection
                    formData={formData}
                    errors={errors}
                    availableTaxes={availableTaxes}
                    paymentTermsList={paymentTermsList}
                    setFormData={setFormData}
                    setErrors={setErrors}
                    handleChange={handleChange}
                    onConfigurePaymentTerms={() => setConfigureTermsOpen(true)}
                    onOpenTaxModal={openTaxModal}
                    showMoreDetails={showMoreDetails}
                    onToggleMoreDetails={() => setShowMoreDetails((prev) => !prev)}
                  />
                )}

                {activeTab === "address" && (
                  <AddressSection
                    formData={formData}
                    setFormData={setFormData}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "contact-persons" && (
                  <ContactPersonsSection formData={formData} setFormData={setFormData} setErrors={setErrors} errors={errors} />
                )}

                {activeTab === "custom-fields" && (
                  <CustomFieldsSection formData={formData} setFormData={setFormData} />
                )}

                {activeTab === "remarks" && <RemarksSection formData={formData} handleChange={handleChange} />}
              </div>

            </div>
          </div>

        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#156372] px-5 text-[14px] font-semibold text-white shadow-md transition-colors hover:bg-[#0f4f5a] focus:outline-none focus:ring-2 focus:ring-[#156372] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-400 bg-white px-5 text-[14px] font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>

      {configureTermsOpen && (
        <ConfigurePaymentTermsModal
          isOpen={configureTermsOpen}
          onClose={() => setConfigureTermsOpen(false)}
          onSave={(terms) => setPaymentTermsList(terms)}
          initialTerms={paymentTermsList}
        />
      )}

      {isCustomerNumberSettingsModalOpen && (
        <CustomerNumberSettingsModal
          isOpen={isCustomerNumberSettingsModalOpen}
          prefix={customerNumberPrefix}
          start={customerNumberStart}
          isSaving={isSavingSettings}
          onPrefixChange={setCustomerNumberPrefix}
          onStartChange={setCustomerNumberStart}
          onSave={handleSaveCustomerNumberSettings}
          onClose={() => setIsCustomerNumberSettingsModalOpen(false)}
        />
      )}

      <NewTaxModal
        isOpen={isNewTaxModalOpen}
        onClose={() => setIsNewTaxModalOpen(false)}
        onCreated={async (tax) => {
          const createdTax = tax?.tax || tax?.data || tax;
          const taxId = String(createdTax?._id || createdTax?.id || createdTax?.tax_id || "");
          await loadTaxes();
          if (taxId) {
            setFormData((prev) => ({ ...prev, taxRate: taxId }));
          }
          setIsNewTaxModalOpen(false);
        }}
      />
    </div>
  );
}
