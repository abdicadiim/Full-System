import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Plus, X, Edit, MoreVertical, Eye, Copy, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

export default function PDFTemplatesPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("Quotes");
  const [selectedTemplate, setSelectedTemplate] = useState("Standard");
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showUseThisCard, setShowUseThisCard] = useState(null);
  const [templates, setTemplates] = useState([
    { id: 1, name: "Standard", type: "Quotes", isDefault: true }
  ]);

  const templateTypes = [
    "Quotes", "Invoices", "Credit Notes", "Purchase Orders", "Payment Receipts",
    "Customer Statements", "Bills", "Vendor Credits", "Vendor Payments",
    "Vendor Statements", "Journals", "Quantity Adjustments", "Value Adjustments"
  ];

  const templateCategories = [
    { name: "All", count: 16 },
    { name: "Standard", count: 5 },
    { name: "Spreadsheet", count: 2 },
    { name: "Premium", count: 3 },
    { name: "Universal", count: 4 },
    { name: "Retail", count: 2 }
  ];

  const standardTemplates = [
    "Standard",
    "Standard - Japanese Style",
    "Standard - Japanese Style (Without Seal boxes)",
    "Standard - European Style",
    "Standard - India GST Style"
  ];

  const spreadsheetTemplates = [
    "Spreadsheet",
    "Spreadsheet - Plus"
  ];

  const premiumTemplates = [
    "Minimalist",
    "Grand",
    "Continental"
  ];

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Templates</h1>
        <div className="flex items-center gap-4">
          <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2">
            <Settings size={16} />
            Configure Export File Name
          </button>
          <button
            onClick={() => setShowTemplateGallery(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Plus size={16} />
            New
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar - Template Types */}
        <div className="w-64 space-y-1">
          {templateTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`w-full text-left px-4 py-2 text-sm rounded transition ${
                selectedType === type
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Right Content - Template Preview */}
        <div className="flex-1">
          <div className="mb-4">
            <select className="h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All {selectedType} Templates</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Standard Template */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white relative">
              <div className="bg-gray-50 rounded border border-gray-200 p-4 mb-3 min-h-[300px]">
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold mb-2">Z</div>
                      <div className="font-semibold">Zylkar Inc</div>
                      <div className="text-xs">Address line</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">QUOTE</div>
                      <div>Quote# EST-17</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="font-semibold mb-1">Rob & Joe Traders</div>
                    <div className="text-xs">Customer address</div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs">Item & Description | Qty | Rate | Amount</div>
                    <div className="text-xs">Sample Item | 1.00 | 300.00 | 300.00</div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs">Sub Total: 630.00</div>
                    <div className="text-xs">Sample Tax (8.70%): 11.75</div>
                    <div className="text-xs font-semibold">Total: Rs.862.75</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Standard Template</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition">
                    <Edit size={16} />
                  </button>
                  <div className="relative">
                    <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* New Template */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[350px]">
              <p className="text-sm text-gray-600 text-center mb-4">
                Click to add a template from our gallery. You can customize the template title, columns, and headers in line item table.
              </p>
              <button
                onClick={() => setShowTemplateGallery(true)}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Plus size={16} />
                New
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Gallery Modal */}
      {showTemplateGallery && createPortal(
        <TemplateGalleryModal
          selectedType={selectedType}
          onClose={() => setShowTemplateGallery(false)}
          onSelectTemplate={(templateName, language) => {
            console.log("Template selected:", templateName, "Language:", language);
            setShowTemplateGallery(false);
            navigate(`/settings/customization/pdf-templates/edit?template=${encodeURIComponent(templateName)}&language=${encodeURIComponent(language || "English")}`);
          }}
        />,
        document.body
      )}
    </div>
  );
}

// Template Gallery Modal Component
function TemplateGalleryModal({ selectedType, onClose, onSelectTemplate }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [flippedCard, setFlippedCard] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState({});

  const templateCategories = [
    { name: "All", count: 16 },
    { name: "Standard", count: 5 },
    { name: "Spreadsheet", count: 2 },
    { name: "Premium", count: 3 },
    { name: "Universal", count: 4 },
    { name: "Retail", count: 2 }
  ];

  const standardTemplates = [
    "Standard",
    "Standard - Japanese Style",
    "Standard - Japanese Style (Without Seal boxes)",
    "Standard - European Style",
    "Standard - India GST Style"
  ];

  const spreadsheetTemplates = [
    "Spreadsheet",
    "Spreadsheet - Plus"
  ];

  const premiumTemplates = [
    "Minimalist",
    "Grand",
    "Continental"
  ];

  const handleUseThis = (templateName) => {
    if (flippedCard === templateName) {
      setFlippedCard(null);
    } else {
      setFlippedCard(templateName);
    }
  };

  const handleSelectTemplate = (templateName, language) => {
    onSelectTemplate(templateName, language);
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Choose a Template</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            {templateCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeCategory === cat.name
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="space-y-8">
            {activeCategory === "All" || activeCategory === "Standard" ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">STANDARD</h4>
                <div className="grid grid-cols-5 gap-4">
                  {standardTemplates.map((template) => (
                    <div key={template} className="relative">
                      <div className={`relative ${flippedCard === template ? 'h-[250px]' : ''}`}>
                        {flippedCard === template ? (
                          <div className="bg-white p-4 border-2 border-blue-500 rounded-lg h-full flex flex-col justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 mb-3">Template Language</div>
                              <p className="text-xs text-gray-600 mb-3">The template will be displayed in the chosen language</p>
                              <select 
                                value={selectedLanguage[template] || "English"}
                                onChange={(e) => setSelectedLanguage({ ...selectedLanguage, [template]: e.target.value })}
                                className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                              </select>
                              <p className="text-xs text-blue-600 mt-2 cursor-pointer">Language not listed?</p>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              <button
                                onClick={() => handleSelectTemplate(template, selectedLanguage[template] || "English")}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                              >
                                Use This
                              </button>
                              <button
                                onClick={() => setFlippedCard(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 transition">
                            <div className="bg-white rounded border border-gray-200 p-2 mb-2 min-h-[150px] text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <div className="w-4 h-4 bg-green-600 rounded text-white text-[8px] flex items-center justify-center">Z</div>
                                <div className="text-[8px] font-semibold">QUOTE</div>
                              </div>
                              <div className="text-[8px] text-gray-600">Sample preview</div>
                            </div>
                            <div className="text-xs font-medium text-gray-900 text-center">{template}</div>
                            <button
                              onClick={() => handleUseThis(template)}
                              className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                            >
                              Use This
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeCategory === "All" || activeCategory === "Spreadsheet" ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">SPREADSHEET</h4>
                <div className="grid grid-cols-5 gap-4">
                  {spreadsheetTemplates.map((template) => (
                    <div key={template} className="relative">
                      <div className={`relative ${flippedCard === template ? 'h-[250px]' : ''}`}>
                        {flippedCard === template ? (
                          <div className="bg-white p-4 border-2 border-blue-500 rounded-lg h-full flex flex-col justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 mb-3">Template Language</div>
                              <p className="text-xs text-gray-600 mb-3">The template will be displayed in the chosen language</p>
                              <select 
                                value={selectedLanguage[template] || "English"}
                                onChange={(e) => setSelectedLanguage({ ...selectedLanguage, [template]: e.target.value })}
                                className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                              </select>
                              <p className="text-xs text-blue-600 mt-2 cursor-pointer">Language not listed?</p>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              <button
                                onClick={() => handleSelectTemplate(template, selectedLanguage[template] || "English")}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                              >
                                Use This
                              </button>
                              <button
                                onClick={() => setFlippedCard(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 transition">
                            <div className="bg-white rounded border border-gray-200 p-2 mb-2 min-h-[150px] text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <div className="w-4 h-4 bg-green-600 rounded text-white text-[8px] flex items-center justify-center">Z</div>
                                <div className="text-[8px] font-semibold">QUOTE</div>
                              </div>
                              <div className="text-[8px] text-gray-600">Sample preview</div>
                            </div>
                            <div className="text-xs font-medium text-gray-900 text-center">{template}</div>
                            <button
                              onClick={() => handleUseThis(template)}
                              className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                            >
                              Use This
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeCategory === "All" || activeCategory === "Premium" ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">PREMIUM</h4>
                <div className="grid grid-cols-5 gap-4">
                  {premiumTemplates.map((template) => (
                    <div key={template} className="relative">
                      <div className={`relative ${flippedCard === template ? 'h-[250px]' : ''}`}>
                        {flippedCard === template ? (
                          <div className="bg-white p-4 border-2 border-blue-500 rounded-lg h-full flex flex-col justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 mb-3">Template Language</div>
                              <p className="text-xs text-gray-600 mb-3">The template will be displayed in the chosen language</p>
                              <select 
                                value={selectedLanguage[template] || "English"}
                                onChange={(e) => setSelectedLanguage({ ...selectedLanguage, [template]: e.target.value })}
                                className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                              </select>
                              <p className="text-xs text-blue-600 mt-2 cursor-pointer">Language not listed?</p>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              <button
                                onClick={() => handleSelectTemplate(template, selectedLanguage[template] || "English")}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                              >
                                Use This
                              </button>
                              <button
                                onClick={() => setFlippedCard(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 transition">
                            <div className="bg-white rounded border border-gray-200 p-2 mb-2 min-h-[150px] text-xs">
                              <div className="flex justify-between items-start mb-1">
                                <div className="w-4 h-4 bg-green-600 rounded text-white text-[8px] flex items-center justify-center">Z</div>
                                <div className="text-[8px] font-semibold">QUOTE</div>
                              </div>
                              <div className="text-[8px] text-gray-600">Sample preview</div>
                            </div>
                            <div className="text-xs font-medium text-gray-900 text-center">{template}</div>
                            <button
                              onClick={() => handleUseThis(template)}
                              className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                            >
                              Use This
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

