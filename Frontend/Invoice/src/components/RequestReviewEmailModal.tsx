import React, { useState } from 'react';
import { 
  X, Bold, Italic, Underline, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Link as LinkIcon, 
  Image as ImageIcon, Send 
} from 'lucide-react';

const RequestReviewEmailModal = ({ customer, isOpen, onClose, onSend }) => {
  const [formData, setFormData] = useState({
    to: customer?.email || '',
    subject: 'taban has invited you to review their service',
    body: `Hi ${customer?.name?.toUpperCase() || 'CUSTOMER'},

taban would like to know how much you like being their client.

"It was a pleasure doing business with you. Your suggestions would be of great value. If you wish to write about your experience with us, kindly click on the link below."`
  });
  const [fontSize, setFontSize] = useState('16 px');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSend) {
      onSend({
        to: formData.to,
        subject: formData.subject,
        body: formData.body
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(21,99,114,0.5)] flex items-center justify-center z-[2000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Email To {customer?.name?.toUpperCase() || 'CUSTOMER'}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 border-none rounded-md cursor-pointer transition-colors bg-transparent text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* From */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From:
              </label>
              <input
                type="text"
                value="JIRDE HUSSEIN KHALIF <jirdehusseinkhalif@gmail.com>"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>

            {/* Send To */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send To:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(21,99,114,0.1)] border border-[rgba(21,99,114,0.2)] rounded-md">
                  <span className="text-sm text-gray-900">
                    {customer?.name?.toLowerCase() || 'customer'} <span className="text-gray-500">&lt;{formData.to}&gt;</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, to: '' }))}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject:
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(21,99,114)]"
              />
            </div>

            {/* Email Body Editor */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body:
              </label>
              
              {/* Formatting Toolbar */}
              <div className="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex items-center gap-2 flex-wrap">
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Bold">
                  <Bold size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Italic">
                  <Italic size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Underline">
                  <Underline size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-sm font-normal line-through" title="Strikethrough">
                  S
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                >
                  <option>12 px</option>
                  <option>14 px</option>
                  <option>16 px</option>
                  <option>18 px</option>
                  <option>20 px</option>
                </select>
                <div className="w-px h-6 bg-gray-300"></div>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Align Left">
                  <AlignLeft size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Align Center">
                  <AlignCenter size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Align Right">
                  <AlignRight size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Justify">
                  <AlignJustify size={16} className="text-gray-600" />
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Bullet List">
                  <List size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Numbered List">
                  <ListOrdered size={16} className="text-gray-600" />
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Insert Link">
                  <LinkIcon size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-1.5 hover:bg-gray-200 rounded" title="Insert Image">
                  <ImageIcon size={16} className="text-gray-600" />
                </button>
              </div>

              {/* Email Content Area */}
              <div className="border-x border-b border-gray-300 rounded-b-md">
                <div className="bg-[rgb(21,99,114)] text-white p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">Rate our service</h3>
                    <p className="text-sm opacity-90">Help us to serve you better</p>
                  </div>
                  <div className="bg-green-500 px-4 py-2 rounded flex items-center gap-1">
                    <span className="text-yellow-300 text-xl">★★★★★</span>
                  </div>
                </div>
                <div className="p-4 bg-white min-h-[300px]">
                  <textarea
                    name="body"
                    value={formData.body}
                    onChange={handleChange}
                    rows={12}
                    className="w-full px-3 py-2 border-none focus:outline-none resize-none"
                    style={{ fontSize: fontSize }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[rgb(21,99,114)] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[rgb(18,85,98)] flex items-center gap-2"
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestReviewEmailModal;

