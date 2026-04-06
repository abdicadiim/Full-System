import React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  HelpCircle,
  Lightbulb,
  Search
} from "lucide-react";
import type { ImportQuotesController } from "./useImportQuotesController";

type Props = {
  controller: ImportQuotesController;
};

export default function ImportQuotesConfigureStep({ controller }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div
        className="border border-dashed border-gray-300 rounded-xl p-10 text-center mb-5"
        ref={controller.dropAreaRef}
        onDragOver={controller.handleDragOver}
        onDragLeave={controller.handleDragLeave}
        onDrop={controller.handleDrop}
      >
        <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-5 shadow-sm">
          <Download size={24} className="text-gray-500" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-5">Drag and drop file to import</p>
        <div className="relative inline-block" ref={controller.fileSourceDropdownRef}>
          <button
            className="px-6 py-2.5 bg-[#156372] text-white text-sm font-semibold rounded-md shadow-sm hover:bg-[#0f4f5b]"
            onClick={(e) => {
              e.stopPropagation();
              controller.setIsFileSourceDropdownOpen(!controller.isFileSourceDropdownOpen);
            }}
          >
            Choose File
          </button>
          {controller.isFileSourceDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px] overflow-hidden">
              <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white" onClick={controller.handleAttachFromDesktop}>Attach From Desktop</button>
              <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white" onClick={controller.handleAttachFromCloud}>Attach From Cloud</button>
              <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white" onClick={controller.handleAttachFromDocuments}>Attach From Documents</button>
            </div>
          )}
        </div>
        {controller.selectedFile && <p className="mt-4 text-sm font-medium text-[#156372]">Selected: {controller.selectedFile.name}</p>}
        <p className="mt-5 text-sm text-gray-500">Maximum File Size: 25 MB • File Format: CSV or TSV or XLS</p>
        <input ref={controller.fileInputRef} type="file" accept=".csv,.tsv,.xls,.xlsx" onChange={controller.handleFileSelect} style={{ display: "none" }} />
      </div>

      <p className="text-sm text-gray-700 mb-8">
        Download a <a href="#" onClick={controller.handleDownloadSampleCsv} className="text-blue-600 hover:underline">sample csv file</a> or <a href="#" onClick={controller.handleDownloadSampleXls} className="text-blue-600 hover:underline">sample xls file</a> and compare it to your import file to ensure you have the file perfect for the import.
      </p>

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
          <div className="flex items-center gap-1 text-gray-800 mt-2">
            <span className="text-sm font-medium">Character Encoding</span>
            <HelpCircle size={14} className="text-gray-400" />
          </div>
          <div className="relative" ref={controller.encodingDropdownRef}>
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-md bg-white text-gray-700 hover:border-[#156372]"
              onClick={() => controller.setIsEncodingDropdownOpen(!controller.isEncodingDropdownOpen)}
            >
              <span className="text-sm text-gray-900">{controller.characterEncoding}</span>
              {controller.isEncodingDropdownOpen ? <ChevronUp size={16} className="text-[#156372]" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>
            {controller.isEncodingDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-md shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 border border-[#156372] rounded-md px-2 py-1.5">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={controller.encodingSearch}
                      onChange={(e) => controller.setEncodingSearch(e.target.value)}
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {controller.filteredEncodingOptions.map((option) => (
                    <button
                      key={option}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                        option === controller.characterEncoding ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-[#156372] hover:text-white"
                      }`}
                      onClick={() => {
                        controller.setCharacterEncoding(option);
                        controller.setIsEncodingDropdownOpen(false);
                        controller.setEncodingSearch("");
                      }}
                    >
                      <span>{option}</span>
                      {option === controller.characterEncoding ? <Check size={14} /> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <label className="inline-flex items-center gap-2 text-gray-900">
          <input
            type="checkbox"
            checked={controller.autoGenerateQuoteNumbers}
            onChange={(e) => controller.setAutoGenerateQuoteNumbers(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium">Auto-Generate Quote Numbers</span>
        </label>
        <p className="mt-2 text-sm text-gray-600 max-w-[760px]">
          Quote numbers will be generated automatically according to your settings. Any Quote numbers in the import file will be ignored.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={16} className="text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-900">Page Tips</h3>
        </div>
        <ul className="space-y-2 text-gray-700 list-disc pl-6">
          <li>You can download the <a href="#" onClick={controller.handleDownloadSampleXls} className="text-blue-600 hover:underline">sample xls file</a> to get detailed information about the data fields used while importing.</li>
          <li>If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.</li>
          <li>You can configure your import settings and save them for future too!</li>
        </ul>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-5">
        <button
          className="px-7 py-2.5 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0f4f5b] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#156372]"
          onClick={controller.handleNext}
          disabled={!controller.selectedFile}
        >
          Next ›
        </button>
        <button className="px-7 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50" onClick={controller.handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
