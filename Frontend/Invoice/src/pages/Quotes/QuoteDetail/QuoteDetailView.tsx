import React from "react";
import { useNavigate } from "react-router-dom";
import QuoteCommentsPanel from "./QuoteCommentsPanel";
import QuoteDetailBulkModals from "./QuoteDetailBulkModals";
import QuoteDetailDesktopSidebar from "./QuoteDetailDesktopSidebar";
import QuoteDetailEmailShareModals from "./QuoteDetailEmailShareModals";
import QuoteDetailMainContent from "./QuoteDetailMainContent";
import QuoteDetailMobileSidebar from "./QuoteDetailMobileSidebar";
import QuoteDetailSupportModals from "./QuoteDetailSupportModals";

const QuoteDetailView = (props: any) => {
  const navigate = useNavigate();
  const { quote, loading } = props;

  if (!quote && loading) {
    return null;
  }

  if (!quote) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2>Quote Not Found</h2>
        <p>The quote you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate("/sales/quotes")}
          className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body > *:not(.print-content),
          .print-content ~ *,
          header,
          nav,
          aside,
          button:not(.print-content button),
          .sidebar,
          [class*="sidebar"],
          [class*="header"],
          [class*="Header"],
          [class*="action"],
          [class*="Action"],
          [class*="dropdown"],
          [class*="Dropdown"],
          [class*="menu"],
          [class*="Menu"] {
            display: none !important;
          }
          .print-content { display: block !important; position: relative !important; margin: 0 !important; padding: 20mm !important; box-shadow: none !important; max-width: 100% !important; width: 210mm !important; min-height: 297mm !important; page-break-inside: avoid; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-content button { display: none !important; }
        }
      `}</style>
      <div className="w-full h-[calc(100vh-4rem)] min-h-0 flex bg-[#f8fafc] overflow-hidden">
        <QuoteDetailDesktopSidebar
          quoteId={String(props.quoteId || "")}
          filteredQuotesList={props.filteredQuotesList}
          selectedQuotes={props.selectedQuotes}
          selectedFilter={props.selectedFilter}
          isFilterDropdownOpen={props.isFilterDropdownOpen}
          isBulkActionsOpen={props.isBulkActionsOpen}
          showSidebarMoreDropdown={props.showSidebarMoreDropdown}
          filterOptions={props.filterOptions}
          setIsFilterDropdownOpen={props.setIsFilterDropdownOpen}
          setSelectedFilter={props.setSelectedFilter}
          setIsBulkActionsOpen={props.setIsBulkActionsOpen}
          setShowSidebarMoreDropdown={props.setShowSidebarMoreDropdown}
          handleSelectAll={props.handleSelectAll}
          handleClearSelection={props.handleClearSelection}
          handleBulkUpdate={props.handleBulkUpdate}
          handleExportPDF={props.handleExportPDF}
          handleBulkMarkAsSent={props.handleBulkMarkAsSent}
          handleBulkDelete={props.handleBulkDelete}
          handleQuoteClick={props.handleQuoteClick}
          handleCreateNewQuote={props.handleCreateNewQuote}
          handleImportQuotes={props.handleImportQuotes}
          handleExportQuotes={props.handleExportQuotes}
          handleSelectQuote={props.handleSelectQuote}
        />

        <QuoteDetailMobileSidebar
          quoteId={String(props.quoteId || "")}
          filteredQuotesList={props.filteredQuotesList}
          selectedQuotes={props.selectedQuotes}
          selectedFilter={props.selectedFilter}
          isFilterDropdownOpen={props.isFilterDropdownOpen}
          filterOptions={props.filterOptions}
          showMobileSidebar={props.showMobileSidebar}
          setShowMobileSidebar={props.setShowMobileSidebar}
          setIsFilterDropdownOpen={props.setIsFilterDropdownOpen}
          setSelectedFilter={props.setSelectedFilter}
          handleQuoteClick={props.handleQuoteClick}
          handleSelectQuote={props.handleSelectQuote}
        />

        <QuoteDetailMainContent
          quote={props.quote}
          selectedQuotes={props.selectedQuotes}
          statusSuccessMessage={props.statusSuccessMessage}
          activeTab={props.activeTab}
          setActiveTab={props.setActiveTab}
          showPdfView={props.showPdfView}
          setShowPdfView={props.setShowPdfView}
          showMailDropdown={props.showMailDropdown}
          setShowMailDropdown={props.setShowMailDropdown}
          showPdfDropdown={props.showPdfDropdown}
          setShowPdfDropdown={props.setShowPdfDropdown}
          showMoreDropdown={props.showMoreDropdown}
          setShowMoreDropdown={props.setShowMoreDropdown}
          showConvertDropdown={props.showConvertDropdown}
          setShowConvertDropdown={props.setShowConvertDropdown}
          setShowMobileSidebar={props.setShowMobileSidebar}
          setShowAttachmentsModal={props.setShowAttachmentsModal}
          setShowCommentsSidebar={props.setShowCommentsSidebar}
          handleClose={props.handleClose}
          handleEdit={props.handleEdit}
          handleSendEmail={props.handleSendEmail}
          handleShare={props.handleShare}
          handleDownloadPDF={props.handleDownloadPDF}
          handleConvertToInvoice={props.handleConvertToInvoice}
          handleConvertToDraft={props.handleConvertToDraft}
          handleCreateProject={props.handleCreateProject}
          handleMarkAsAccepted={props.handleMarkAsAccepted}
          handleMarkAsDeclined={props.handleMarkAsDeclined}
          handleMarkCurrentAsSent={props.handleMarkCurrentAsSent}
          handleQuotePreferences={props.handleQuotePreferences}
          handleDeleteQuote={props.handleDeleteQuote}
          handleCopyQuoteLink={props.handleCopyQuoteLink}
          linkedInvoices={props.linkedInvoices}
          linkedInvoicesLoading={props.linkedInvoicesLoading}
          quoteTotalsMeta={props.quoteTotalsMeta}
          organizationProfile={props.organizationProfile}
          ownerEmail={props.ownerEmail}
          activityLogs={props.activityLogs}
          isQuoteDocumentHovered={props.isQuoteDocumentHovered}
          setIsQuoteDocumentHovered={props.setIsQuoteDocumentHovered}
          isCustomizeDropdownOpen={props.isCustomizeDropdownOpen}
          setIsCustomizeDropdownOpen={props.setIsCustomizeDropdownOpen}
          quoteAttachments={props.quoteAttachments}
          isUploadingAttachment={props.isUploadingAttachment}
          attachmentsFileInputRef={props.attachmentsFileInputRef}
          handleFileUpload={props.handleFileUpload}
          handleRemoveAttachment={props.handleRemoveAttachment}
        />

        {props.showCommentsSidebar && (
          <QuoteCommentsPanel
            open={props.showCommentsSidebar}
            onClose={() => props.setShowCommentsSidebar(false)}
            quoteId={String(props.quoteId || props.quote?.id || props.quote?._id || "")}
            comments={props.comments}
            onCommentsChange={(nextComments) => {
              props.setComments(nextComments as any);
              props.setQuote((prev: any) => (prev ? { ...prev, comments: nextComments } : prev));
            }}
            updateQuote={props.updateQuoteDep}
          />
        )}

        <QuoteDetailBulkModals
          isBulkUpdateModalOpen={props.isBulkUpdateModalOpen}
          setIsBulkUpdateModalOpen={props.setIsBulkUpdateModalOpen}
          isMarkAsSentModalOpen={props.isMarkAsSentModalOpen}
          setIsMarkAsSentModalOpen={props.setIsMarkAsSentModalOpen}
          isDeleteModalOpen={props.isDeleteModalOpen}
          setIsDeleteModalOpen={props.setIsDeleteModalOpen}
          bulkUpdateField={props.bulkUpdateField}
          setBulkUpdateField={props.setBulkUpdateField}
          bulkUpdateValue={props.bulkUpdateValue}
          setBulkUpdateValue={props.setBulkUpdateValue}
          isBulkFieldDropdownOpen={props.isBulkFieldDropdownOpen}
          setIsBulkFieldDropdownOpen={props.setIsBulkFieldDropdownOpen}
          bulkFieldSearch={props.bulkFieldSearch}
          setBulkFieldSearch={props.setBulkFieldSearch}
          filteredBulkFields={props.filteredBulkFields}
          handleBulkUpdateSubmit={props.handleBulkUpdateSubmit}
          handleConfirmMarkAsSent={props.handleConfirmMarkAsSent}
          handleConfirmDelete={props.handleConfirmDelete}
        />

        <QuoteDetailEmailShareModals
          quote={props.quote}
          showEmailModal={props.showEmailModal}
          setShowEmailModal={props.setShowEmailModal}
          showEmailDetails={props.showEmailDetails}
          setShowEmailDetails={props.setShowEmailDetails}
          emailData={props.emailData}
          setEmailData={props.setEmailData}
          showCc={props.showCc}
          setShowCc={props.setShowCc}
          showBcc={props.showBcc}
          setShowBcc={props.setShowBcc}
          attachments={props.attachments}
          setAttachments={props.setAttachments}
          attachQuotePDF={props.attachQuotePDF}
          setAttachQuotePDF={props.setAttachQuotePDF}
          fontSize={props.fontSize}
          setFontSize={props.setFontSize}
          isBold={props.isBold}
          setIsBold={props.setIsBold}
          isItalic={props.isItalic}
          setIsItalic={props.setIsItalic}
          isUnderline={props.isUnderline}
          setIsUnderline={props.setIsUnderline}
          isStrikethrough={props.isStrikethrough}
          setIsStrikethrough={props.setIsStrikethrough}
          emailModalRef={props.emailModalRef}
          fileInputRef={props.fileInputRef}
          organizationProfile={props.organizationProfile}
          ownerEmail={props.ownerEmail}
          showShareModal={props.showShareModal}
          setShowShareModal={props.setShowShareModal}
          shareVisibility={props.shareVisibility}
          setShareVisibility={props.setShareVisibility}
          isVisibilityDropdownOpen={props.isVisibilityDropdownOpen}
          setIsVisibilityDropdownOpen={props.setIsVisibilityDropdownOpen}
          linkExpirationDate={props.linkExpirationDate}
          setLinkExpirationDate={props.setLinkExpirationDate}
          generatedLink={props.generatedLink}
          setGeneratedLink={props.setGeneratedLink}
          isLinkGenerated={props.isLinkGenerated}
          setIsLinkGenerated={props.setIsLinkGenerated}
          shareModalRef={props.shareModalRef}
          visibilityDropdownRef={props.visibilityDropdownRef}
          handleGenerateLink={props.handleGenerateLink}
          handleCopyLink={props.handleCopyLink}
          handleDisableAllActiveLinks={props.handleDisableAllActiveLinks}
        />

        <QuoteDetailSupportModals
          quote={props.quote}
          showAttachmentsModal={props.showAttachmentsModal}
          setShowAttachmentsModal={props.setShowAttachmentsModal}
          quoteAttachments={props.quoteAttachments}
          isDragging={props.isDragging}
          setIsDragging={props.setIsDragging}
          handleDrop={props.handleDrop}
          handleDragOver={props.handleDragOver}
          handleDragLeave={props.handleDragLeave}
          handleFileUpload={props.handleFileUpload}
          handleFileClick={props.handleFileClick}
          handleRemoveAttachment={props.handleRemoveAttachment}
          attachmentsFileInputRef={props.attachmentsFileInputRef}
          isUploadingAttachment={props.isUploadingAttachment}
          showImageViewer={props.showImageViewer}
          setShowImageViewer={props.setShowImageViewer}
          selectedImage={props.selectedImage}
          setSelectedImage={props.setSelectedImage}
          showCustomFieldsModal={props.showCustomFieldsModal}
          setShowCustomFieldsModal={props.setShowCustomFieldsModal}
          customFields={props.customFields}
          showOrganizationAddressModal={props.isOrganizationAddressModalOpen}
          setShowOrganizationAddressModal={props.setIsOrganizationAddressModalOpen}
          organizationData={props.organizationData}
          setOrganizationData={props.setOrganizationData}
          logoPreview={props.logoPreview}
          setLogoPreview={props.setLogoPreview}
          logoFile={props.logoFile}
          setLogoFile={props.setLogoFile}
          organizationAddressFileInputRef={props.organizationAddressFileInputRef}
          updateOrganizationProfile={props.updateOrganizationProfile}
          showTermsModal={props.isTermsAndConditionsModalOpen}
          setShowTermsModal={props.setIsTermsAndConditionsModalOpen}
          termsData={props.termsData}
          setTermsData={props.setTermsData}
        />
      </div>
    </>
  );
};

export default QuoteDetailView;
