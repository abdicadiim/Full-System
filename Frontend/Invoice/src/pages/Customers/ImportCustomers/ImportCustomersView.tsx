import React from "react";
import { Check, X } from "lucide-react";
import ImportCustomersConfigureStep from "./ImportCustomersConfigureStep";
import ImportCustomersMapFieldsStep from "./ImportCustomersMapFieldsStep";
import ImportCustomersPreviewStep from "./ImportCustomersPreviewStep";
import ImportCustomersCloudPickerModal from "./ImportCustomersCloudPickerModal";
import ImportCustomersDocumentsModal from "./ImportCustomersDocumentsModal";
import ImportCustomersDecimalFormatModal from "./ImportCustomersDecimalFormatModal";

export default function ImportCustomersView({ controller }: { controller: any }) {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {controller.currentStep === "configure" ? "Customers - Select File" : controller.currentStep === "mapFields" ? "Map Fields" : "Preview"}
            </h1>
            <button className="p-2 hover:bg-gray-100 rounded-lg text-red-500 hover:text-red-600 transition-colors" onClick={controller.handleClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${controller.currentStep === "configure" ? "bg-blue-600 text-white" : "bg-green-500 text-white"} rounded-full flex items-center justify-center font-bold text-sm shadow-md`}>
                {controller.currentStep === "configure" ? "1" : <Check size={16} />}
              </div>
              <div className={`text-sm font-semibold mt-2 ${controller.currentStep === "configure" ? "text-blue-600" : "text-gray-600"}`}>Configure</div>
            </div>
            <div className={`w-24 h-1 mx-4 ${controller.currentStep !== "configure" ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${controller.currentStep === "mapFields" ? "bg-blue-600 text-white" : controller.currentStep === "preview" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${controller.currentStep === "mapFields" ? "shadow-md" : ""}`}>
                {controller.currentStep === "preview" ? <Check size={16} /> : "2"}
              </div>
              <div className={`text-sm font-semibold mt-2 ${controller.currentStep === "mapFields" ? "text-blue-600" : "text-gray-600"}`}>Map Fields</div>
            </div>
            <div className={`w-24 h-1 mx-4 ${controller.currentStep === "preview" ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 ${controller.currentStep === "preview" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"} rounded-full flex items-center justify-center font-bold text-sm ${controller.currentStep === "preview" ? "shadow-md" : ""}`}>3</div>
              <div className={`text-sm font-semibold mt-2 ${controller.currentStep === "preview" ? "text-blue-600" : "text-gray-600"}`}>Preview</div>
            </div>
          </div>
        </div>

        {controller.currentStep === "configure" && <ImportCustomersConfigureStep controller={controller} />}
        {controller.currentStep === "mapFields" && <ImportCustomersMapFieldsStep controller={controller} />}
        {controller.currentStep === "preview" && <ImportCustomersPreviewStep controller={controller} />}
      </div>

      <ImportCustomersCloudPickerModal controller={controller} />
      <ImportCustomersDocumentsModal controller={controller} />
      <ImportCustomersDecimalFormatModal controller={controller} />
    </div>
  );
}
