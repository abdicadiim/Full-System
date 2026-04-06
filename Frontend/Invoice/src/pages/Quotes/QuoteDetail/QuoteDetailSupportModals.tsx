import React from "react";
import { FileText, Lock, Upload, X } from "lucide-react";

type Props = {
  quote: any;
  showAttachmentsModal: boolean;
  setShowAttachmentsModal: (value: boolean) => void;
  quoteAttachments: any[];
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  handleDrop: (e: any) => void;
  handleDragOver: (e: any) => void;
  handleDragLeave: (e: any) => void;
  handleFileUpload: (files: any[]) => void;
  handleFileClick: (attachment: any) => void;
  handleRemoveAttachment: (id: any) => void;
  attachmentsFileInputRef: any;
  isUploadingAttachment: boolean;
  showImageViewer: boolean;
  setShowImageViewer: (value: boolean) => void;
  selectedImage: string | null;
  setSelectedImage: (value: string | null) => void;
  showCustomFieldsModal: boolean;
  setShowCustomFieldsModal: (value: boolean) => void;
  customFields: any[];
  showOrganizationAddressModal: boolean;
  setShowOrganizationAddressModal: (value: boolean) => void;
  organizationData: any;
  setOrganizationData: (value: any) => void;
  logoPreview: string | null;
  setLogoPreview: (value: string | null) => void;
  logoFile: File | null;
  setLogoFile: (value: File | null) => void;
  organizationAddressFileInputRef: any;
  updateOrganizationProfile: (profileData: any) => void;
  showTermsModal: boolean;
  setShowTermsModal: (value: boolean) => void;
  termsData: any;
  setTermsData: (value: any) => void;
};

const QuoteDetailSupportModals = (props: Props) => {
  const {
    quote,
    showAttachmentsModal,
    setShowAttachmentsModal,
    quoteAttachments,
    isDragging,
    setIsDragging,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileUpload,
    handleFileClick,
    handleRemoveAttachment,
    attachmentsFileInputRef,
    isUploadingAttachment,
    showImageViewer,
    setShowImageViewer,
    selectedImage,
    setSelectedImage,
    showCustomFieldsModal,
    setShowCustomFieldsModal,
    customFields,
    showOrganizationAddressModal,
    setShowOrganizationAddressModal,
    organizationData,
    setOrganizationData,
    logoPreview,
    setLogoPreview,
    logoFile,
    setLogoFile,
    organizationAddressFileInputRef,
    updateOrganizationProfile,
    showTermsModal,
    setShowTermsModal,
    termsData,
    setTermsData,
  } = props;

  return (
    <>
      {showAttachmentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowAttachmentsModal(false); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Attachments</h2>
              <button className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded text-white hover:bg-blue-700" onClick={() => setShowAttachmentsModal(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {quoteAttachments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-900 mb-6 text-lg">No Files Attached</p>
                  <div className={`border-2 border-dashed rounded-lg p-12 cursor-pointer ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => attachmentsFileInputRef.current?.click()}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 flex items-center justify-center"><Upload size={32} className="text-blue-600" /></div>
                      <div className="flex items-center gap-2 text-base text-gray-900">
                        <span>Upload your</span><span className="font-medium">Files</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-6">You can upload a maximum of 5 files, 10MB each</p>
                  {isUploadingAttachment && <p className="text-sm text-blue-600 mt-2">Uploading attachment...</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {quoteAttachments.map((attachment) => (
                    <div key={attachment.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-100" onClick={() => handleFileClick(attachment)}>
                      {attachment.preview || attachment.url ? <img src={attachment.preview || attachment.url} alt={attachment.name} className="w-12 h-12 object-cover rounded" /> : <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center"><FileText size={20} className="text-gray-500" /></div>}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{attachment.name}</div>
                        <div className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(2)} KB</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(attachment.id); }} className="p-1 hover:bg-red-100 rounded text-red-600"><X size={16} /></button>
                    </div>
                  ))}
                  {quoteAttachments.length < 5 && (
                    <div className={`border-2 border-dashed rounded-lg p-6 cursor-pointer ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => attachmentsFileInputRef.current?.click()}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Upload size={20} className="text-gray-400" /></div>
                        <div className="flex items-center gap-1 text-sm text-gray-700"><span>Upload your</span><span className="text-blue-600 font-medium">Files</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input ref={attachmentsFileInputRef} type="file" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) handleFileUpload(files); e.target.value = ""; }} />
            </div>
          </div>
        </div>
      )}

      {showImageViewer && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center" onClick={() => { setShowImageViewer(false); setSelectedImage(null); }}>
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 text-gray-900" onClick={() => { setShowImageViewer(false); setSelectedImage(null); }}><X size={24} /></button>
            <img src={selectedImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {showCustomFieldsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowCustomFieldsModal(false); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Manage Custom Fields</h2>
              <button className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900" onClick={() => setShowCustomFieldsModal(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="px-4 py-3 text-left">FIELD NAME</th><th className="px-4 py-3 text-left">DATA TYPE</th><th className="px-4 py-3 text-left">MANDATORY</th><th className="px-4 py-3 text-left">SHOW IN ALL PDFS</th><th className="px-4 py-3 text-left">STATUS</th></tr></thead>
                <tbody>
                  {customFields.map((field) => (
                    <tr key={field.id} className="border-b border-gray-200">
                      <td className="px-4 py-3"><div className="flex items-center gap-2">{field.isLocked && <Lock size={14} className="text-gray-400" />}<span>{field.name}</span></div></td>
                      <td className="px-4 py-3">{field.dataType}</td>
                      <td className="px-4 py-3">{field.mandatory ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{field.showInPDF ? "Yes" : "No"}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-[#e6f3f1] text-[#0D4A52] rounded text-xs font-medium">{field.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setShowCustomFieldsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showOrganizationAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
              <button className="p-2 text-white rounded" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={() => setShowOrganizationAddressModal(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4">
                {logoPreview ? <img src={logoPreview} alt="Logo Preview" className="w-20 h-20 object-cover rounded border border-gray-300" /> : <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center"><Upload size={24} className="text-gray-400" /></div>}
                <div>
                  <input type="file" ref={organizationAddressFileInputRef} accept="image/*" onChange={(e: any) => { const file = e.target.files?.[0]; if (file) { setLogoFile(file); const reader = new FileReader(); reader.onloadend = () => setLogoPreview(String(reader.result)); reader.readAsDataURL(file); } }} className="hidden" />
                  <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={() => organizationAddressFileInputRef.current?.click()}>Upload Logo</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.street1} onChange={(e) => setOrganizationData({ ...organizationData, street1: e.target.value })} placeholder="Address Line 1" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.street2} onChange={(e) => setOrganizationData({ ...organizationData, street2: e.target.value })} placeholder="Address Line 2" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.city} onChange={(e) => setOrganizationData({ ...organizationData, city: e.target.value })} placeholder="City" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.zipCode} onChange={(e) => setOrganizationData({ ...organizationData, zipCode: e.target.value })} placeholder="Zip Code" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.stateProvince} onChange={(e) => setOrganizationData({ ...organizationData, stateProvince: e.target.value })} placeholder="State/Province" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.phone} onChange={(e) => setOrganizationData({ ...organizationData, phone: e.target.value })} placeholder="Phone" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.faxNumber} onChange={(e) => setOrganizationData({ ...organizationData, faxNumber: e.target.value })} placeholder="Fax Number" />
                <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={organizationData.websiteUrl} onChange={(e) => setOrganizationData({ ...organizationData, websiteUrl: e.target.value })} placeholder="Website URL" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={() => { void updateOrganizationProfile(organizationData); setShowOrganizationAddressModal(false); }}>Save</button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setShowOrganizationAddressModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Update Terms & Conditions</h2>
              <button className="p-2 text-white rounded" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={() => setShowTermsModal(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                <textarea value={termsData.notes} onChange={(e) => setTermsData({ ...termsData, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm min-h-[100px]" />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={termsData.useNotesForAllQuotes} onChange={(e) => setTermsData({ ...termsData, useNotesForAllQuotes: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Use this in future for all quotes of all customers.</span>
                </label>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                <textarea value={termsData.termsAndConditions} onChange={(e) => setTermsData({ ...termsData, termsAndConditions: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm min-h-[200px]" />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={termsData.useTermsForAllQuotes} onChange={(e) => setTermsData({ ...termsData, useTermsForAllQuotes: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Use this in future for all quotes of all customers.</span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button className="px-4 py-2 text-white rounded-md text-sm font-medium" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }} onClick={() => setShowTermsModal(false)}>Save</button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium" onClick={() => setShowTermsModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuoteDetailSupportModals;

