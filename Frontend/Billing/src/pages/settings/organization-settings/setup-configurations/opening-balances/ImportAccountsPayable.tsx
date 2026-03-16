import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Download, ChevronRight, Upload, Lightbulb, Info } from "lucide-react";

export default function ImportAccountsPayable() {
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleNext = () => {
    if (selectedFile && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCancel = () => {
    navigate("/settings/opening-balances");
  };

  return (
    <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Accounts Payable - Select File</h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 1 ? "text-white bg-blue-600" : "text-gray-500 bg-gray-200"}`}>
              1 Configure
            </span>
            <ChevronRight size={16} className="text-gray-500" />
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 2 ? "text-white bg-blue-600" : "text-gray-500 bg-gray-200"}`}>
              2 Map Fields
            </span>
            <ChevronRight size={16} className="text-gray-500" />
            <span className={`px-3 py-1 text-sm font-medium rounded ${currentStep === 3 ? "text-white bg-blue-600" : "text-gray-500 bg-gray-200"}`}>
              3 Preview
            </span>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="p-8 max-w-2xl mx-auto">
        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-12 text-center ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 mb-4">Drag and drop file to import</p>
          <div className="relative inline-block">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <ChevronRight size={16} className="rotate-90" />
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Maximum File Size: 25 MB • File Format: CSV or TSV or XLS
          </p>
        </div>

        {/* Sample File Link */}
        <div className="mt-4 text-sm text-gray-600">
          Download a{" "}
          <a href="#" className="text-blue-600 hover:underline">
            sample file
          </a>{" "}
          and compare it to your import file to ensure you have the file perfect for the import.
        </div>

        {/* Character Encoding */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Character Encoding</label>
            <button className="text-gray-400 hover:text-gray-600">
              <Info size={14} />
            </button>
          </div>
          <select
            value={characterEncoding}
            onChange={(e) => setCharacterEncoding(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTF-8">UTF-8 (Unicode)</option>
            <option value="ISO-8859-1">ISO-8859-1</option>
            <option value="Windows-1252">Windows-1252</option>
          </select>
        </div>

        {/* Page Tips */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                • If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
              </p>
              <p>
                • You can configure your import settings and save them for future too!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedFile}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
}

