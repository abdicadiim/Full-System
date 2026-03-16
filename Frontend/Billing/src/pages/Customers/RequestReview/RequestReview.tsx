import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCustomerById } from "../../salesModel";
import { getMe, getCurrentUser } from "../../../services/auth";
import { customersAPI } from "../../../services/api";
import { toast } from "react-toastify";
import { X, Bold, Italic, Underline, Link2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, ChevronDown } from "lucide-react";

export default function RequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [emailData, setEmailData] = useState({
    from: "",
    sendTo: "",
    subject: "",
    body: ""
  });
  const [fontSize, setFontSize] = useState("16 px");
  const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://books.zohosecure.com/portal/tabanenterprises");
  const [rateButtonUrl, setRateButtonUrl] = useState("");
  const [selectedRating, setSelectedRating] = useState(0); // Track selected star rating
  const [companyLogo, setCompanyLogo] = useState(null); // Company logo image
  const [logoPreview, setLogoPreview] = useState(null); // Logo preview URL
  const emailBodyRef = useRef(null);
  const logoInputRef = useRef(null);

  // Fetch current logged-in user from backend
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoadingUser(true);
        // Try to get from API first
        const userData = await getMe();
        if (userData && userData.user) {
          setCurrentUser(userData.user);
          if (userData.organization) {
            setOrganization(userData.organization);
          }
        } else {
          // Fallback to localStorage
          const localUser = getCurrentUser();
          if (localUser) {
            setCurrentUser(localUser);
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        // Fallback to localStorage
        const localUser = getCurrentUser();
        if (localUser) {
          setCurrentUser(localUser);
        }
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch customer and update email data when both customer and user are loaded
  useEffect(() => {
    const loadCustomer = async () => {
      if (!id) return;

      try {
        // Try to fetch from API first
        const response = await customersAPI.getById(id);
        if (response && response.data) {
          setCustomer(response.data);
        } else {
          // Fallback to local model
          const localCustomer = getCustomerById(id);
          if (localCustomer) {
            setCustomer(localCustomer);
          }
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        // Fallback to local model
        const localCustomer = getCustomerById(id);
        if (localCustomer) {
          setCustomer(localCustomer);
        }
      }
    };

    loadCustomer();
  }, [id]);

  // Update email data when customer and currentUser are available
  useEffect(() => {
    if (!customer || !currentUser) return;

    const customerName = customer.name || customer.displayName || customer.companyName || "";
    const customerEmail = customer.email || customer.contactPersons?.[0]?.email || "";
    const firstName = customer.firstName || customerName.split(' ')[0] || 'ME';

    // Get user name and email
    const userName = currentUser.name || currentUser.displayName || "";
    const userEmail = currentUser.email || "";
    const userDisplayName = userName || "User";

    // Format "From" field
    const fromField = userEmail ? `${userDisplayName} <${userEmail}>` : userDisplayName;

    // Get organization name (if available)
    const orgName = organization?.name || currentUser.organization?.name || "TABAN ENTERPRISES";

    // Create email body
    const emailBody = `Hi ${firstName},

${orgName} would like to know how much you like being their client.

"It was a pleasure doing business with you. Your suggestions would be of great value. If you wish to write about your experience with us, kindly click on the link below."

[Click to Rate]

Your Sincerely,
${orgName}`;

    // Extract just the email address for sendTo (not the name)
    const sendToEmail = customerEmail || '';

    setEmailData({
      from: fromField,
      sendTo: sendToEmail, // Store just email, not name
      subject: `${orgName} has invited you to review their service`,
      body: emailBody
    });

    // Set initial content of editable div if it's empty
    if (emailBodyRef.current) {
      const currentContent = emailBodyRef.current.innerText || emailBodyRef.current.textContent || '';
      if (!currentContent.trim() || currentContent.trim().length < 10) {
        // Clear and set the full email body text
        emailBodyRef.current.innerText = '';
        emailBodyRef.current.textContent = emailBody;
        // Also update state
        setEmailData(prev => ({ ...prev, body: emailBody }));
      }
    }
  }, [customer, currentUser, organization]);

  const handleSend = async () => {
    // Extract email content from editable div
    const emailBodyElement = emailBodyRef.current;
    let emailContent = '';

    if (emailBodyElement) {
      // Get text content from the editable div - try multiple methods to ensure we get full content
      emailContent = emailBodyElement.innerText ||
        emailBodyElement.textContent ||
        emailBodyElement.innerHTML?.replace(/<[^>]*>/g, '') ||
        '';

      // If still empty, try getting from emailData.body
      if (!emailContent || emailContent.trim().length === 0) {
        emailContent = emailData.body || '';
      }
    } else {
      // Fallback to emailData.body
      emailContent = emailData.body || '';
    }

    // Ensure we have content - check minimum length
    const trimmedContent = emailContent.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      toast.error('Please enter email content (at least 10 characters)');
      console.error('Email content too short:', trimmedContent.length, 'characters');
      return;
    }

    // Extract email address from sendTo (remove name if present)
    let recipientEmail = emailData.sendTo;
    if (recipientEmail.includes('<') && recipientEmail.includes('>')) {
      // Extract email from "Name <email@example.com>" format
      const match = recipientEmail.match(/<([^>]+)>/);
      if (match) {
        recipientEmail = match[1];
      }
    } else if (!recipientEmail.includes('@')) {
      // If no email found, try to get from customer
      recipientEmail = customer?.email || customer?.contactPersons?.[0]?.email || '';
    }

    if (!recipientEmail || !recipientEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate subject
    if (!emailData.subject || !emailData.subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    // Validate body
    if (!emailContent || !emailContent.trim()) {
      toast.error('Please enter email content');
      return;
    }

    try {
      // Show loading state
      const loadingToast = toast.loading('Sending email...');

      // Prepare email data
      const emailPayload = {
        email: recipientEmail.trim(),
        subject: emailData.subject.trim(),
        body: trimmedContent
      };

      // Log for debugging (remove in production if needed)
      console.log('Sending email with payload:', {
        email: emailPayload.email,
        subject: emailPayload.subject,
        bodyLength: emailPayload.body.length,
        bodyPreview: emailPayload.body.substring(0, 100) + '...'
      });

      // Send email through backend API
      const response = await customersAPI.sendReviewRequest(id, emailPayload);

      if (response && response.success) {
        toast.dismiss(loadingToast);
        toast.success(`✅ Review request email sent successfully to ${recipientEmail.trim()}`);

        // Navigate back after a short delay
        setTimeout(() => {
          navigate(`/sales/customers/${id}`);
        }, 1500);
      } else {
        throw new Error(response?.message || response?.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending review request email:', error);
      const errorMessage = error.data?.message || error.data?.error || error.message || 'Unknown error';

      toast.error(`❌ Failed to send email: ${errorMessage}`, {
        autoClose: 5000
      });
    }
  };

  const handleCancel = () => {
    navigate(`/sales/customers/${id}`);
  };

  const removeRecipient = () => {
    setEmailData(prev => ({ ...prev, sendTo: "" }));
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setCompanyLogo(base64String);
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Formatting functions
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    emailBodyRef.current?.focus();
  };

  const handleFormat = (command, value = null) => {
    if (emailBodyRef.current) {
      emailBodyRef.current.focus();
      execCommand(command, value);
      // Update emailData.body after formatting
      const content = emailBodyRef.current.innerText || emailBodyRef.current.textContent || '';
      setEmailData(prev => ({ ...prev, body: content }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">
          Email To {customer?.name || customer?.displayName || customer?.companyName || 'Customer'}
        </h1>
        <button
          onClick={handleCancel}
          className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Email Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
          {/* From Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">From:</label>
            {isLoadingUser ? (
              <div className="text-sm text-gray-500">Loading user information...</div>
            ) : (
              <div className="text-sm text-gray-900">
                {emailData.from || (currentUser ? `${currentUser.name || 'User'} <${currentUser.email || ''}>` : 'No user found')}
              </div>
            )}
          </div>

          {/* Send To Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Send To:</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                value={emailData.sendTo && emailData.sendTo.includes('<') && emailData.sendTo.includes('>')
                  ? (emailData.sendTo.match(/<([^>]+)>/)?.[1] || emailData.sendTo)
                  : (emailData.sendTo || '')}
                onChange={(e) => {
                  const emailValue = e.target.value;
                  setEmailData(prev => ({ ...prev, sendTo: emailValue }));
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {emailData.sendTo && emailData.sendTo.trim() && (
                <button
                  onClick={removeRecipient}
                  className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer hover:bg-gray-100 rounded"
                  title="Remove email"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Subject Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Formatting Toolbar */}
          <div className="mb-4 flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <button
              onClick={() => handleFormat('bold')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Bold"
            >
              <Bold size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleFormat('italic')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Italic"
            >
              <Italic size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleFormat('underline')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Underline"
            >
              <Underline size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleFormat('strikeThrough')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Strikethrough"
            >
              <span className="text-sm font-semibold text-gray-700">S</span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <div className="relative">
              <button
                onClick={() => setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded cursor-pointer"
              >
                {fontSize} <ChevronDown size={14} />
              </button>
              {isFontSizeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[100px]">
                  {["10 px", "12 px", "14 px", "16 px", "18 px", "20 px", "24 px"].map((size) => (
                    <div
                      key={size}
                      className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setFontSize(size);
                        setIsFontSizeDropdownOpen(false);
                        const sizeValue = size.replace(' px', '');
                        handleFormat('fontSize', sizeValue);
                      }}
                    >
                      {size}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => handleFormat('justifyLeft')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Align Left"
            >
              <AlignLeft size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleFormat('justifyCenter')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Align Center"
            >
              <AlignCenter size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleFormat('justifyRight')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Align Right"
            >
              <AlignRight size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => handleFormat('justifyFull')}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Justify"
            >
              <AlignJustify size={16} className="text-gray-700" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <div className="relative">
              <button
                onClick={() => handleFormat('insertUnorderedList')}
                className="p-2 hover:bg-gray-200 rounded cursor-pointer"
                title="Bullet List"
              >
                <List size={16} className="text-gray-700" />
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => handleFormat('insertOrderedList')}
                className="p-2 hover:bg-gray-200 rounded cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered size={16} className="text-gray-700" />
              </button>
            </div>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setIsLinkDialogOpen(true)}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Insert Link"
            >
              <Link2 size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              title="Insert Image/Logo"
            >
              <ImageIcon size={16} className="text-gray-700" />
            </button>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />

          {/* Email Body */}
          <div className="border border-gray-300 rounded-md min-h-[400px] bg-white">
            <div className="p-6">
              {/* Logo and Banner Section */}
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center cursor-pointer relative group border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                    onClick={() => logoInputRef.current?.click()}
                    title="Click to upload company logo"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company Logo"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-2xl">📚</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-opacity">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100">Change</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: '#156372' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <div className="text-lg font-semibold mb-1">Rate our service</div>
                      <div className="text-sm opacity-90">Help us to serve you better</div>
                    </div>
                    <div className="px-4 py-3 rounded-md" style={{ backgroundColor: '#f0f9ff' }}>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            onClick={() => setSelectedRating(star)}
                            className={`text-xl cursor-pointer transition-colors ${star <= selectedRating
                              ? 'text-orange-500'
                              : 'text-gray-300'
                              }`}
                            style={{
                              color: star <= selectedRating ? '#f97316' : '#d1d5db',
                              fontSize: '1.25rem'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedRating === 0 || star <= selectedRating) {
                                e.currentTarget.style.color = '#f97316';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (star > selectedRating) {
                                e.currentTarget.style.color = '#d1d5db';
                              }
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <div className="w-full h-1 bg-gray-300 mt-2 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Content - Editable */}
              {isLoadingUser || !currentUser ? (
                <div className="text-gray-500 p-6">Loading email content...</div>
              ) : (
                <div
                  ref={emailBodyRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="text-gray-900 text-sm leading-relaxed min-h-[200px] outline-none focus:outline-none p-2"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    WebkitUserSelect: 'text',
                    userSelect: 'text'
                  }}
                  onInput={(e) => {
                    // Update emailData.body when user edits - capture full content
                    const content = e.currentTarget.innerText ||
                      e.currentTarget.textContent ||
                      '';
                    // Always update to prevent overlapping
                    setEmailData(prev => ({ ...prev, body: content }));
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    if (emailBodyRef.current) {
                      const selection = window.getSelection();
                      if (selection.rangeCount > 0) {
                        selection.deleteContents();
                        selection.getRangeAt(0).insertNode(document.createTextNode(text));
                        selection.collapseToEnd();
                      }
                    }
                    // Update after paste
                    setTimeout(() => {
                      const content = emailBodyRef.current?.innerText || emailBodyRef.current?.textContent || '';
                      setEmailData(prev => ({ ...prev, body: content }));
                    }, 0);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Link Input Dialog */}
      {isLinkDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsLinkDialogOpen(false);
                  setLinkUrl("https://books.zohosecure.com/portal/tabanenterprises");
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (linkUrl.trim()) {
                    setRateButtonUrl(linkUrl.trim());
                    // Insert link into email body
                    if (emailBodyRef.current && linkUrl.trim()) {
                      emailBodyRef.current.focus();
                      execCommand('createLink', linkUrl.trim());
                      // Update emailData.body after inserting link
                      setTimeout(() => {
                        const content = emailBodyRef.current?.innerText || emailBodyRef.current?.textContent || '';
                        setEmailData(prev => ({ ...prev, body: content }));
                      }, 0);
                    }
                    setIsLinkDialogOpen(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

