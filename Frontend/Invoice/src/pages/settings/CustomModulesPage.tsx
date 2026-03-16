import React, { useState, useEffect } from "react";
import { X, Info, ChevronDown, ChevronUp, Check, ArrowLeft } from "lucide-react";

export default function CustomModulesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [moduleName, setModuleName] = useState("");
  const [pluralName, setPluralName] = useState("");
  const [description, setDescription] = useState("");
  const [useInProducts, setUseInProducts] = useState({
    zohoBooks: true,
    zohoBilling: false,
    zohoExpense: false,
    zohoInventory: false,
    zohoCommerce: false
  });
  
  // Step 2 states
  const [labelName, setLabelName] = useState("");
  const [dataType, setDataType] = useState("Auto-Generate Number");
  const [prefix, setPrefix] = useState("");
  const [startingNumber, setStartingNumber] = useState("");
  const [suffix, setSuffix] = useState("");
  const [preventDuplicate, setPreventDuplicate] = useState("No");
  const [showDataTypeDropdown, setShowDataTypeDropdown] = useState(false);

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleCancel = () => {
    setShowCreateModal(false);
    setCurrentStep(1);
    setModuleName("");
    setPluralName("");
    setDescription("");
    setUseInProducts({
      zohoBooks: true,
      zohoBilling: false,
      zohoExpense: false,
      zohoInventory: false,
      zohoCommerce: false
    });
    setLabelName("");
    setDataType("Auto-Generate Number");
    setPrefix("");
    setStartingNumber("");
    setSuffix("");
    setPreventDuplicate("No");
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const dataTypeOptions = [
    "Text Box (Single Line)",
    "Auto-Generate Number"
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center py-12">
          {/* Illustration */}
          <div className="relative mb-8 flex items-center justify-center" style={{ width: "300px", height: "250px" }}>
            {/* Person */}
            <div className="relative z-10" style={{ left: "-40px", top: "20px" }}>
              {/* Head */}
              <div 
                className="absolute rounded-full"
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "#1e293b",
                  top: "0px",
                  left: "20px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                {/* Hair */}
                <div 
                  className="absolute rounded-full"
                  style={{
                    width: "70px",
                    height: "50px",
                    backgroundColor: "#1e293b",
                    top: "-10px",
                    left: "-5px",
                    borderRadius: "50% 50% 0 0"
                  }}
                ></div>
              </div>
              
              {/* Body/Shirt */}
              <div 
                className="absolute rounded-lg"
                style={{
                  width: "80px",
                  height: "100px",
                  backgroundColor: "#3b82f6",
                  top: "50px",
                  left: "10px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              ></div>
              
              {/* Arms holding blocks */}
              <div 
                className="absolute rounded-lg"
                style={{
                  width: "30px",
                  height: "40px",
                  backgroundColor: "#f59e0b",
                  top: "60px",
                  left: "-15px",
                  transform: "rotate(-15deg)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              ></div>
              <div 
                className="absolute rounded-lg"
                style={{
                  width: "30px",
                  height: "40px",
                  backgroundColor: "#10b981",
                  top: "60px",
                  right: "-15px",
                  transform: "rotate(15deg)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              ></div>
              <div 
                className="absolute rounded-lg"
                style={{
                  width: "30px",
                  height: "40px",
                  backgroundColor: "#ef4444",
                  top: "80px",
                  left: "-20px",
                  transform: "rotate(-10deg)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              ></div>
              <div 
                className="absolute rounded-lg"
                style={{
                  width: "30px",
                  height: "40px",
                  backgroundColor: "#8b5cf6",
                  top: "80px",
                  right: "-20px",
                  transform: "rotate(10deg)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              ></div>
            </div>
            
            {/* Background wireframe/dashboard */}
            <div className="absolute" style={{ left: "80px", top: "40px" }}>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="border-2 border-gray-300 rounded-lg bg-gray-50"
                    style={{
                      width: "60px",
                      height: "50px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    <div className="p-2">
                      <div className="w-full h-2 bg-gray-200 rounded mb-1"></div>
                      <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introducing Custom Modules</h2>
          <p className="text-sm text-gray-600 text-center mb-8 max-w-2xl">
            Create Custom Modules to record and track information that cannot be recorded in the pre-defined modules of Zoho Books.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            Create Module
          </button>
        </div>
      </div>

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Module</h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-4 px-6 pt-6 pb-4 border-b border-gray-200">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                {currentStep > 1 ? (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-green-500 text-white">
                    <Check size={16} />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    1
                  </div>
                )}
                <span className="text-sm font-medium">Module Details</span>
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Primary Field Properties</span>
                  <Info size={14} className="text-gray-400" />
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {currentStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Module Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter module name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plural Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={pluralName}
                      onChange={(e) => setPluralName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter plural name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Enter description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Use Custom Module In
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useInProducts.zohoBooks}
                          onChange={(e) => setUseInProducts({...useInProducts, zohoBooks: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Zoho Books</span>
                        <Info size={14} className="text-gray-400" />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useInProducts.zohoBilling}
                          onChange={(e) => setUseInProducts({...useInProducts, zohoBilling: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Zoho Billing</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useInProducts.zohoExpense}
                          onChange={(e) => setUseInProducts({...useInProducts, zohoExpense: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Zoho Expense</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useInProducts.zohoInventory}
                          onChange={(e) => setUseInProducts({...useInProducts, zohoInventory: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Zoho Inventory</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useInProducts.zohoCommerce}
                          onChange={(e) => setUseInProducts({...useInProducts, zohoCommerce: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Zoho Commerce</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      Note: Only admins and users with relevant permission can access the records of this custom module.
                    </p>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Label Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={labelName}
                      onChange={(e) => setLabelName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter label name"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Type <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDataTypeDropdown(!showDataTypeDropdown);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between"
                    >
                      <span className="text-gray-700">{dataType}</span>
                      {showDataTypeDropdown ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </button>
                    {showDataTypeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {dataTypeOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setDataType(option);
                              setShowDataTypeDropdown(false);
                              // Reset fields when data type changes
                              if (option !== "Auto-Generate Number") {
                                setStartingNumber("");
                                setPrefix("");
                                setSuffix("");
                              }
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                              dataType === option ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            <span>{option}</span>
                            {dataType === option && <Check size={16} className="text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Show these fields only when Data Type is "Auto-Generate Number" */}
                  {dataType === "Auto-Generate Number" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter prefix"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Starting Number <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          value={startingNumber}
                          onChange={(e) => setStartingNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter starting number"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Suffix
                        </label>
                        <input
                          type="text"
                          value={suffix}
                          onChange={(e) => setSuffix(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter suffix"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Prevent Duplicate Values
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="preventDuplicate"
                          value="Yes"
                          checked={preventDuplicate === "Yes"}
                          onChange={(e) => setPreventDuplicate(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="preventDuplicate"
                          value="No"
                          checked={preventDuplicate === "No"}
                          onChange={(e) => setPreventDuplicate(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              {currentStep === 1 && (
                <>
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Next
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <button
                    onClick={handleBack}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="Back"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

