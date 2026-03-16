import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2 as LinkIcon, Image, List, ChevronDown, Strikethrough, Table } from "lucide-react";

interface SignatureSettingsModalProps {
  onClose: () => void;
  onSave: (signature: string) => void;
  initialSignature?: string;
}

export default function SignatureSettingsModal({ onClose, onSave, initialSignature = "" }: SignatureSettingsModalProps) {
  const [signature, setSignature] = useState(initialSignature);
  const [showPlaceholderDropdown, setShowPlaceholderDropdown] = useState(false);

  useEffect(() => {
    setSignature(initialSignature || "");
  }, [initialSignature]);

  const placeholders = [
    "%InvoiceNumber%",
    "%CompanyName%",
    "%CustomerName%",
    "%Balance%",
    "%InvoiceDate%",
    "%DueDate%",
    "%OverdueDays%",
    "%UserName%",
    "%CompanyAddress%",
    "%CompanyPhone%",
    "%CompanyEmail%"
  ];

  const handleInsertPlaceholder = (placeholder) => {
    setSignature(prev => prev + placeholder);
    setShowPlaceholderDropdown(false);
  };

  const handleSave = () => {
    onSave(signature);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Signature Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Below signature will appear on all templates.</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Rich Text Editor Toolbar */}
        <div className="border-b border-gray-200 p-2 bg-gray-50 flex items-center gap-2 flex-wrap">
          {/* Text Style Dropdown */}
          <select className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Normal Text</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option>Heading 3</option>
            <option>Paragraph</option>
          </select>

          {/* Formatting Buttons */}
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Bold">
            <Bold size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Italic">
            <Italic size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Underline">
            <Underline size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Strikethrough">
            <Strikethrough size={16} className="text-gray-700" />
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Font Color and Highlight */}
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Text Color">
            <div className="w-4 h-4 border border-gray-400 rounded" style={{ borderBottomWidth: '3px' }}></div>
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Highlight Color">
            <div className="w-4 h-4 border border-gray-400 rounded bg-yellow-200"></div>
          </button>

          {/* Font Family Dropdown */}
          <select className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Times New Roman</option>
            <option>Arial</option>
            <option>Helvetica</option>
            <option>Courier New</option>
            <option>Georgia</option>
            <option>Verdana</option>
          </select>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Alignment */}
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Align Left">
            <AlignLeft size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Align Center">
            <AlignCenter size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Align Right">
            <AlignRight size={16} className="text-gray-700" />
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Lists */}
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Bullet List">
            <List size={16} className="text-gray-700" />
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* Insert Options */}
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Insert Link">
            <LinkIcon size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Insert Image">
            <Image size={16} className="text-gray-700" />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition" title="Insert Table">
            <Table size={16} className="text-gray-700" />
          </button>

          <div className="flex-1"></div>

          {/* Insert Placeholders Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPlaceholderDropdown(!showPlaceholderDropdown)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
            >
              Insert Placeholders
              <ChevronDown size={14} />
            </button>
            {showPlaceholderDropdown && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2 max-h-60 overflow-y-auto">
                  {placeholders.map((placeholder) => (
                    <button
                      key={placeholder}
                      onClick={() => handleInsertPlaceholder(placeholder)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                    >
                      {placeholder}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature Text Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full h-full min-h-[300px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Enter your signature content here..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

