import React, { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  Pencil,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";

export default function InvoiceSupportModals(props: any) {
  const {
    showAttachmentsModal,
    setShowAttachmentsModal,
    invoiceAttachments,
    handleFileUpload,
    handleRemoveAttachment,
    isChooseTemplateModalOpen,
    setIsChooseTemplateModalOpen,
    isOrganizationAddressModalOpen,
    setIsOrganizationAddressModalOpen,
    organizationData,
    setOrganizationData,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    handleLogoUpload,
    stateOptions,
    isTermsAndConditionsModalOpen,
    setIsTermsAndConditionsModalOpen,
    termsData,
    setTermsData,
  } = props;

  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);
  const organizationAddressFileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Template");

  const closeAttachmentsModal = () => {
    setShowAttachmentsModal(false);
    setIsDragging(false);
    setSelectedImage(null);
    setShowImageViewer(false);
  };

  const handleAttachmentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    event.target.value = "";
  };

  const handleAttachmentClick = (attachment: any) => {
    if (attachment.type && attachment.type.startsWith("image/")) {
      setSelectedImage(
        attachment.preview || (attachment.file ? URL.createObjectURL(attachment.file) : null),
      );
      setShowImageViewer(true);
      return;
    }

    if (attachment.file) {
      const url = URL.createObjectURL(attachment.file);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleAttachmentDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleAttachmentDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleAttachmentDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const closeImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
  };

  const saveOrganizationData = () => {
    localStorage.setItem("organization_address", JSON.stringify(organizationData));
    setIsOrganizationAddressModalOpen(false);
  };

  return (
    <>
      {showAttachmentsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAttachmentsModal();
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Attachments</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                onClick={closeAttachmentsModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {invoiceAttachments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No Files Attached</p>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
                      isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                    }`}
                    onDrop={handleAttachmentDrop}
                    onDragOver={handleAttachmentDragOver}
                    onDragLeave={handleAttachmentDragLeave}
                    onClick={() => attachmentsFileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileUp size={24} className="text-gray-400" />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <span>Upload your</span>
                        <span className="text-blue-600 font-medium">Files</span>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    You can upload a maximum of 5 files, 10MB each.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoiceAttachments.map((attachment: any) => {
                    const isImage = attachment.type && attachment.type.startsWith("image/");

                    return (
                      <div
                        key={attachment.id}
                        className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleAttachmentClick(attachment)}
                      >
                        {isImage && attachment.preview ? (
                          <img
                            src={attachment.preview}
                            alt={attachment.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <FileText size={20} className="text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 font-medium truncate">
                            {attachment.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(Number(attachment.size || 0) / 1024).toFixed(2)} KB
                          </div>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveAttachment(attachment.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}

                  {invoiceAttachments.length < 5 && (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                      }`}
                      onDrop={handleAttachmentDrop}
                      onDragOver={handleAttachmentDragOver}
                      onDragLeave={handleAttachmentDragLeave}
                      onClick={() => attachmentsFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileUp size={20} className="text-gray-400" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <span>Upload your</span>
                          <span className="text-blue-600 font-medium">Files</span>
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={attachmentsFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentInputChange}
              />
            </div>
          </div>
        </div>
      )}

      {showImageViewer && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center"
          onClick={closeImageViewer}
        >
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={(event) => event.stopPropagation()}>
            <button
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 text-gray-900"
              onClick={closeImageViewer}
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {isChooseTemplateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div
            className="bg-white h-full w-[500px] flex flex-col shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
              <button
                className="p-1 text-red-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                onClick={() => setIsChooseTemplateModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search Template"
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-blue-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div
                    className="bg-gray-50 rounded border border-gray-200 p-4 mb-3"
                    style={{ minHeight: "200px" }}
                  >
                    <div className="text-xs">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        >
                          Z
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">INVOICE</div>
                        </div>
                      </div>

                      <div className="space-y-1 text-gray-600">
                        <div className="flex justify-between">
                          <span>Invoice #:</span>
                          <span>INV-001</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span>01/01/2024</span>
                        </div>
                        <div className="border-t border-gray-300 my-2" />
                        <div className="flex justify-between">
                          <span>Item 1</span>
                          <span>$100.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Item 2</span>
                          <span>$200.00</span>
                        </div>
                        <div className="border-t border-gray-300 my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>$300.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTemplate === "Standard Template" ? (
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium transition-opacity"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.opacity = "0.9";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.opacity = "1";
                      }}
                    >
                      <Star size={16} fill="white" />
                      SELECTED
                    </button>
                  ) : (
                    <button
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                      onClick={() => setSelectedTemplate("Standard Template")}
                    >
                      Select
                    </button>
                  )}
                </div>

                <div className="text-center mt-2">
                  <span className="text-sm font-medium text-gray-900">Standard Template</span>
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <ChevronUp size={16} className="text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      {isOrganizationAddressModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
              <button
                className="p-2 text-white rounded transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={() => setIsOrganizationAddressModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => organizationAddressFileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.currentTarget.classList.add("border-blue-500");
                      }}
                      onDragLeave={(event) => {
                        event.currentTarget.classList.remove("border-blue-500");
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.currentTarget.classList.remove("border-blue-500");
                        const files = event.dataTransfer.files;
                        if (files.length > 0) {
                          handleLogoUpload(files[0]);
                        }
                      }}
                    >
                      {logoPreview ? (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="max-w-full max-h-32 mx-auto mb-2"
                          />
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setLogoFile(null);
                              setLogoPreview(null);
                            }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-700 font-medium">
                            Upload Your Organization Logo
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      ref={organizationAddressFileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files && event.target.files[0]) {
                          handleLogoUpload(event.target.files[0]);
                        }
                      }}
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      This logo will be displayed in transaction PDFs and email notifications.
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      Supported Files: jpg, jpeg, png, gif, bmp
                    </p>
                    <p className="text-sm text-gray-600">Maximum File Size: 1MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street 1
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={organizationData.street1}
                      onChange={(event) =>
                        setOrganizationData({
                          ...organizationData,
                          street1: event.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    <Pencil
                      size={14}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street 2
                  </label>
                  <input
                    type="text"
                    value={organizationData.street2}
                    onChange={(event) =>
                      setOrganizationData({
                        ...organizationData,
                        street2: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={organizationData.city}
                      onChange={(event) =>
                        setOrganizationData({
                          ...organizationData,
                          city: event.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP/Postal Code
                    </label>
                    <input
                      type="text"
                      value={organizationData.zipCode}
                      onChange={(event) =>
                        setOrganizationData({
                          ...organizationData,
                          zipCode: event.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province <span className="text-red-600">*</span>
                    </label>
                    <input
                      list="invoice-organization-state-options"
                      value={organizationData.stateProvince}
                      onChange={(event) =>
                        setOrganizationData({
                          ...organizationData,
                          stateProvince: event.target.value,
                        })
                      }
                      placeholder="State/Province"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                    />
                    <datalist id="invoice-organization-state-options">
                      {stateOptions.map((state: string) => (
                        <option key={state} value={state} />
                      ))}
                    </datalist>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={organizationData.phone}
                      onChange={(event) =>
                        setOrganizationData({
                          ...organizationData,
                          phone: event.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fax Number
                  </label>
                  <input
                    type="text"
                    value={organizationData.faxNumber}
                    onChange={(event) =>
                      setOrganizationData({
                        ...organizationData,
                        faxNumber: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    placeholder="Website URL"
                    value={organizationData.websiteUrl}
                    onChange={(event) =>
                      setOrganizationData({
                        ...organizationData,
                        websiteUrl: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Industry
                  </label>
                  <select
                    value={organizationData.industry}
                    onChange={(event) =>
                      setOrganizationData({
                        ...organizationData,
                        industry: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
                  >
                    <option value="">Select Industry</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="services">Services</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={saveOrganizationData}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                onClick={() => setIsOrganizationAddressModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isTermsAndConditionsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Update Terms & Conditions</h2>
              <button
                className="p-2 text-white rounded transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={() => setIsTermsAndConditionsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                <textarea
                  value={termsData.notes}
                  onChange={(event) =>
                    setTermsData({ ...termsData, notes: event.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                  placeholder="Enter notes..."
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsData.useNotesForAllInvoices}
                    onChange={(event) =>
                      setTermsData({
                        ...termsData,
                        useNotesForAllInvoices: event.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Use this in future for all invoices of all customers.
                  </span>
                </label>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Terms & Conditions
                </h3>
                <textarea
                  value={termsData.termsAndConditions}
                  onChange={(event) =>
                    setTermsData({
                      ...termsData,
                      termsAndConditions: event.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                  placeholder="Enter terms and conditions..."
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsData.useTermsForAllInvoices}
                    onChange={(event) =>
                      setTermsData({
                        ...termsData,
                        useTermsForAllInvoices: event.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Use this in future for all invoices of all customers.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium transition-opacity"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = "1";
                }}
                onClick={() => setIsTermsAndConditionsModalOpen(false)}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                onClick={() => setIsTermsAndConditionsModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
