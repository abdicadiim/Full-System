import React from "react";
import { Check, ChevronDown, ChevronLeft, HelpCircle } from "lucide-react";
import type { ImportQuotesController } from "./useImportQuotesController";

type Props = {
  controller: ImportQuotesController;
};

export default function ImportQuotesPreviewStep({ controller }: Props) {
  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <HelpCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          All Quotes in your file are ready to be imported
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Check size={20} className="text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              Quotes that are ready to be imported - {controller.previewData.readyToImport}
            </span>
          </div>
          <button
            onClick={() => controller.setShowReadyDetails(!controller.showReadyDetails)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
            <ChevronDown size={16} className={controller.showReadyDetails ? "rotate-180" : ""} />
          </button>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              No. of Records skipped - {controller.previewData.skippedRecords}
            </span>
          </div>
          <button
            onClick={() => controller.setShowSkippedDetails(!controller.showSkippedDetails)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
            <ChevronDown size={16} className={controller.showSkippedDetails ? "rotate-180" : ""} />
          </button>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              Unmapped Fields - {controller.previewData.unmappedFields}
            </span>
          </div>
          <button
            onClick={() => controller.setShowUnmappedDetails(!controller.showUnmappedDetails)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
            <ChevronDown size={16} className={controller.showUnmappedDetails ? "rotate-180" : ""} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
          onClick={controller.handlePrevious}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <div className="flex items-center gap-3">
          <button
            className={`px-8 py-3 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm ${controller.isImporting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            onClick={controller.handleImport}
            disabled={controller.isImporting}
          >
            {controller.isImporting ? "Importing..." : "Import"}
          </button>
          <button
            className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            onClick={controller.handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
