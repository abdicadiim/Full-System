import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Globe, AlertCircle, Phone, Mail, MessageCircle, X, Video, Headphones, Search, Calendar } from "lucide-react";

export default function CustomDomainPage() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isRecordScreenModalOpen, setIsRecordScreenModalOpen] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState("Contact Support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [priority, setPriority] = useState("None");
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [prioritySearch, setPrioritySearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convenientDateTime, setConvenientDateTime] = useState("");
  const fileInputRef = useRef(null);
  const priorityRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const [chatName, setChatName] = useState("Ismahan Hussein Abdi");
  const [chatEmail, setChatEmail] = useState("ismahussein2002@gmail.com");
  const [chatMessage, setChatMessage] = useState("");

  // Click away handler for priority dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (priorityRef.current && !priorityRef.current.contains(event.target) && 
          priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
        setPriorityDropdownOpen(false);
      }
    };
    if (priorityDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [priorityDropdownOpen]);

  const priorityOptions = [
    "None",
    "Just FYI",
    "Nothing urgent, can wait",
    "I'm stuck, need assistance"
  ];

  const filteredPriorityOptions = useMemo(() => {
    const s = prioritySearch.trim().toLowerCase();
    return s ? priorityOptions.filter((o) => o.toLowerCase().includes(s)) : priorityOptions;
  }, [prioritySearch]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleMapDomain = () => {
    setIsMapModalOpen(true);
    setCurrentStep(1);
  };

  const handleOkGotIt = () => {
    setCurrentStep(2);
  };

  const handleEmailClick = () => {
    setIsEmailModalOpen(true);
  };

  const handleChatClick = () => {
    setIsChatModalOpen(true);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Custom Domain</h1>
      </div>

      {/* Custom Domain Mapping */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Domain Mapping</h2>
        <p className="text-sm text-gray-600 mb-4">
          This feature lets your customers access their Customer Portal and vendor portal with a custom domain name.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          For example, let's say your company's name is Zylker and your website's domain name is https://www.zylker.com. With domain mapping, your customers can access their Customer Portal from the subdomain https://books.zylker.com/portal instead of https://books.zoho.com/portal.
        </p>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-6">
          Read more about Domain Mapping
        </button>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-4">
            <Globe size={64} className="text-gray-400" />
            <div className="absolute -top-1 -right-1">
              <AlertCircle size={24} className="text-red-500" />
            </div>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-4">
            You have not mapped a custom domain yet.
          </p>
          <button
            onClick={handleMapDomain}
            className="px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            Map Custom Domain
          </button>
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Phone Support */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone size={20} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Phone Support</h3>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              You can directly talk to us every
            </p>
            <p className="text-xs text-gray-600 mb-2 font-medium">
              Monday to Friday 9:00 AM to 6:00 PM
            </p>
            <p className="text-xs text-gray-600">
              Zoho Books Helpline: 0800601172, 0800211152 (Toll Free)
            </p>
          </div>

          {/* Email Support */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mail size={20} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Email Us</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Have questions regarding custom domains ? Feel free to write to us at support.africa@zohobooks.com and we'll be glad to assist you.
            </p>
            <button
              onClick={handleEmailClick}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
            >
              Contact Support
            </button>
          </div>

          {/* Chat Support */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={20} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Chat Support</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Have questions regarding custom domains? Feel free to chat with us.
            </p>
            <button
              onClick={handleChatClick}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
            >
              Chat with our experts
            </button>
          </div>
        </div>
      </div>

      {/* Map Custom Domain Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Complete these steps to map your domain in Zoho Books
              </h3>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep > 1 ? 'bg-green-600 text-white' : currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > 1 ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      '1'
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Domain mapping</span>
                </div>
                <div className={`w-12 h-0.5 ${currentStep > 1 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <span className="text-sm font-medium text-gray-700">Add Domain</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </div>
                  <span className="text-sm font-medium text-gray-700">Verify Ownership</span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {currentStep === 1 && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-3">What is domain mapping?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Mapping a custom domain to Zoho Books lets your customers access their Customer Portal from a custom domain.
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    To map a custom domain in Zoho Books, you must set up a CNAME record from your domain name provider's website and then verify the ownership of your custom domain name. To get started, click Ok, Got it. <button className="text-blue-600 hover:underline">Learn more</button>
                  </p>

                  {/* Example */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="text"
                        value="https://books.zoho.com/portal"
                        readOnly
                        className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                      />
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <input
                        type="text"
                        value="https://abc.yourcompanyname.com/portal"
                        readOnly
                        className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
                      />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>abc</strong> : subdomain name.</p>
                      <p><strong>yourcompanyname.com</strong> : domain name.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Add Domain</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Enter your custom domain details below.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your custom domain name:
                    </label>
                    <div className="flex items-center">
                      <div className="h-10 px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 flex items-center text-sm text-gray-600">
                        https://
                      </div>
                      <input
                        type="text"
                        placeholder="E.g. books.zylker.com"
                        className="flex-1 h-10 px-3 rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Verify Ownership</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Verify the ownership of your custom domain.
                  </p>
                  {/* Add verification form fields here */}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Need Help? <button className="text-blue-600 hover:underline">support@zohobooks.com</button> and we'll be glad to assist you.
                </div>
                <div className="flex items-center gap-3">
                  {currentStep === 1 ? (
                    <>
                      <button
                        onClick={() => setIsMapModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleOkGotIt}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                      >
                        Ok, got it
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => currentStep < 3 ? setCurrentStep(currentStep + 1) : setIsMapModalOpen(false)}
                        className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${
                          currentStep === 2 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {currentStep < 3 ? 'Next' : 'Complete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Support Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">How Can We Help You Today?</h3>
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Issue Resolution */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video size={24} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Are you facing an issue?</p>
                    <p className="text-xs text-gray-600">Record a video of the issue you're facing and help us resolve it faster.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRecordScreenModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  Record Screen
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("Contact Support")}
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition ${
                    activeTab === "Contact Support"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Contact Support
                </button>
                <button
                  onClick={() => setActiveTab("Request a Demo")}
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition ${
                    activeTab === "Request a Demo"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Request a Demo
                </button>
                <button
                  onClick={() => setActiveTab("Request a Call")}
                  className={`px-4 py-2 border-b-2 text-sm font-medium transition ${
                    activeTab === "Request a Call"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Request a Call
                </button>
              </div>

              {/* Form */}
              {activeTab === "Contact Support" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tell us in detail</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Post your support request online and we will connect you with an expert."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments <span className="text-gray-400">?</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Choose File
                    </button>
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx}>{file.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter contact number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <div ref={priorityRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                        className={`w-full h-10 px-3 rounded-lg border-2 bg-white text-left text-sm font-medium flex items-center justify-between transition ${
                          priorityDropdownOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <span className={priority ? "text-gray-900" : "text-gray-500"}>
                          {priority || "None"}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className={`transition-transform ${priorityDropdownOpen ? "rotate-180" : ""}`}
                        >
                          <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {priorityDropdownOpen && createPortal(
                        <div
                          ref={priorityDropdownRef}
                          className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                          style={{
                            top: `${priorityRef.current?.getBoundingClientRect().bottom + 8}px`,
                            left: `${priorityRef.current?.getBoundingClientRect().left}px`,
                            width: `${priorityRef.current?.getBoundingClientRect().width}px`,
                            zIndex: 99999,
                            maxHeight: '320px',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                            <Search size={16} className="text-gray-400" />
                            <input
                              autoFocus
                              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                              placeholder="Search"
                              value={prioritySearch}
                              onChange={(e) => setPrioritySearch(e.target.value)}
                            />
                          </div>
                          <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                            {filteredPriorityOptions.map((opt) => {
                              const isSelected = opt === priority;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                                    ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                                  `}
                                  onClick={() => {
                                    setPriority(opt);
                                    setPriorityDropdownOpen(false);
                                    setPrioritySearch("");
                                  }}
                                >
                                  <span>{opt}</span>
                                  {isSelected && (
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                            {filteredPriorityOptions.length === 0 && (
                              <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                            )}
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Request a Demo" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tell us in detail</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Post your support request online and we will connect you with an expert."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter contact number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Convenient Date & Time *</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={convenientDateTime}
                        onChange={(e) => setConvenientDateTime(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="When should we reach you? Please specify your time zone as well."
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">* Example: Sep 18, 9:00-11:00A.M PST.</p>
                  </div>
                </div>
              )}

              {activeTab === "Request a Call" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tell us in detail</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Post your support request online and we will connect you with an expert."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter contact number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Convenient Date & Time *</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={convenientDateTime}
                        onChange={(e) => setConvenientDateTime(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="When should we reach you? Please specify your time zone as well."
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">* Example: Sep 18, 9:00-11:00A.M PST.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  <strong>Note:</strong> Responses to this email will be sent to ismahussein2002@gmail.com.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle send
                    setIsEmailModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Send
                </button>
              </div>

              {/* Talk to us */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Headphones size={20} className="text-gray-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Talk to us (Mon - Fri • Toll Free)</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🇺🇸</span>
                    <span className="text-sm text-gray-700">+1 8443165544</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🇬🇧</span>
                    <span className="text-sm text-gray-700">+44 8000856099</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🇦🇺</span>
                    <span className="text-sm text-gray-700">+61 1800911076</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-t-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsChatModalOpen(false)}
                  className="text-white hover:text-gray-300"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <MessageCircle size={16} className="text-white" />
                </div>
                <span className="text-white font-medium">Chat with us now</span>
              </div>
              <button
                onClick={() => setIsChatModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Last name *</label>
                <input
                  type="text"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Email address *</label>
                <input
                  type="email"
                  value={chatEmail}
                  onChange={(e) => setChatEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">Message</label>
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Type your query and hit 'Enter'"
                />
              </div>
              <button
                onClick={() => {
                  // Handle start chat
                  setIsChatModalOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <span>Start Chat</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-900 border-t border-gray-700 rounded-b-lg">
              <p className="text-xs text-gray-400 text-center">
                Driven by Zoho SalesIQ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Record Screen Modal */}
      {isRecordScreenModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Record Screen & Share Feedback</h3>
                <button
                  onClick={() => setIsRecordScreenModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-red-600" />
                </button>
              </div>

              {/* Consent Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Provide consent for recording</p>
                  <p className="text-sm text-gray-600">
                    You can record your screen for up to 5 minutes or less. Once you click Start Recording, you are consenting to allow us to collect the following details:
                  </p>
                </div>
              </div>

              {/* Data Collection List */}
              <div className="mb-6 space-y-3">
                {[
                  "Your IP address.",
                  "Browser console logs generated during the recording.",
                  "Device details that include screen resolution, browser version, and operating system.",
                  "Client-side performance metrics (DNS look-up time, TCP connection time, and similar metrics).",
                  "A screen recording of the window or the screen area that you specify. If the screen contains any sensitive information, you'll have the option to edit and mask such details.",
                  "Audio recorded during the screen recording. If you don't want the audio, you may mute it during recording, or record voiceover separately."
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5">
                      <circle cx="10" cy="10" r="9" stroke="#10b981" strokeWidth="2" fill="#10b981"/>
                      <path d="M6 10l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>

              {/* Consent Checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={(e) => setConsentAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to allow Zoho Books to collect the data mentioned above
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    if (consentAgreed) {
                      // Handle start recording
                      setIsRecordScreenModalOpen(false);
                      // Here you would typically start screen recording
                    }
                  }}
                  disabled={!consentAgreed}
                  className={`px-6 py-2.5 rounded-lg text-white text-sm font-medium transition ${
                    consentAgreed
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Start Recording
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

