import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, RefreshCw, ChevronRight, ChevronDown, Info } from "lucide-react";

export default function TemplateEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("General");
  const [expandedSections, setExpandedSections] = useState({
    templateProperties: true,
    font: false,
    background: false
  });

  const [templateData, setTemplateData] = useState({
    templateName: "Standard",
    paperSize: "A4",
    orientation: "Portrait",
    margins: {
      top: "0.7",
      bottom: "0.7",
      left: "0.55",
      right: "0.4"
    }
  });

  const sections = [
    { id: "General", icon: "📄" },
    { id: "Header & Footer", icon: "📋" },
    { id: "Transaction Details", icon: "📝" },
    { id: "Table", icon: "📊" },
    { id: "Total", icon: "∑" },
    { id: "Other Details", icon: "⚙️" }
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Edit Template</h1>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            Select Color Theme
            <ChevronDown size={16} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <RefreshCw size={18} />
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
            Save
          </button>
          <button
            onClick={() => navigate("/settings/customization/pdf-templates")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-gray-800 text-white">
          <div className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                  activeSection === section.id
                    ? "bg-red-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span className="text-sm font-medium">{section.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Settings */}
          <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              {activeSection === "General" && (
                <>
                  {/* Template Properties */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleSection("templateProperties")}
                      className="w-full flex items-center justify-between text-left mb-3"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">Template Properties</h3>
                      {expandedSections.templateProperties ? (
                        <ChevronDown size={16} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-600" />
                      )}
                    </button>
                    {expandedSections.templateProperties && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template Name<span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={templateData.templateName}
                            onChange={(e) => setTemplateData({ ...templateData, templateName: e.target.value })}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium text-gray-700">Paper Size</label>
                            <Info size={14} className="text-gray-400" />
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="paperSize"
                                value="A5"
                                checked={templateData.paperSize === "A5"}
                                onChange={(e) => setTemplateData({ ...templateData, paperSize: e.target.value })}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">A5</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="paperSize"
                                value="A4"
                                checked={templateData.paperSize === "A4"}
                                onChange={(e) => setTemplateData({ ...templateData, paperSize: e.target.value })}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">A4</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="paperSize"
                                value="Letter"
                                checked={templateData.paperSize === "Letter"}
                                onChange={(e) => setTemplateData({ ...templateData, paperSize: e.target.value })}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Letter</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Orientation</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="orientation"
                                value="Portrait"
                                checked={templateData.orientation === "Portrait"}
                                onChange={(e) => setTemplateData({ ...templateData, orientation: e.target.value })}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Portrait</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="orientation"
                                value="Landscape"
                                checked={templateData.orientation === "Landscape"}
                                onChange={(e) => setTemplateData({ ...templateData, orientation: e.target.value })}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Landscape</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Margins (in inches)
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Top</label>
                              <input
                                type="number"
                                value={templateData.margins.top}
                                onChange={(e) => setTemplateData({
                                  ...templateData,
                                  margins: { ...templateData.margins, top: e.target.value }
                                })}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Bottom</label>
                              <input
                                type="number"
                                value={templateData.margins.bottom}
                                onChange={(e) => setTemplateData({
                                  ...templateData,
                                  margins: { ...templateData.margins, bottom: e.target.value }
                                })}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Left</label>
                              <input
                                type="number"
                                value={templateData.margins.left}
                                onChange={(e) => setTemplateData({
                                  ...templateData,
                                  margins: { ...templateData.margins, left: e.target.value }
                                })}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Right</label>
                              <input
                                type="number"
                                value={templateData.margins.right}
                                onChange={(e) => setTemplateData({
                                  ...templateData,
                                  margins: { ...templateData.margins, right: e.target.value }
                                })}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Font Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleSection("font")}
                      className="w-full flex items-center justify-between text-left mb-3"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">Font</h3>
                      {expandedSections.font ? (
                        <ChevronDown size={16} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Background Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleSection("background")}
                      className="w-full flex items-center justify-between text-left mb-3"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">Background</h3>
                      {expandedSections.background ? (
                        <ChevronDown size={16} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </>
              )}

              {activeSection !== "General" && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">{activeSection} settings coming soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
            <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
              {/* Preview Content */}
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-orange-500 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-white font-bold text-xl">T</span>
                    </div>
                    <div className="font-semibold text-gray-900">TABAN ENTERPRISES</div>
                    <div className="text-sm text-gray-600">taleex</div>
                    <div className="text-sm text-gray-600">taleex</div>
                    <div className="text-sm text-gray-600">mogadishu Nairobi 22223</div>
                    <div className="text-sm text-gray-600">Kenya</div>
                    <div className="text-sm text-gray-600">jirdehusseinkhalif@gmail.com</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900 mb-1">QUOTE</div>
                    <div className="text-sm text-gray-600">Quote# QT-17</div>
                  </div>
                </div>

                {/* Bill To Section */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Bill To</div>
                    <div className="text-sm text-gray-600">
                      <div>Rob & Joe Traders</div>
                      <div>4141 Hacienda Drive</div>
                      <div>Pleasanton</div>
                      <div>94588 CA</div>
                      <div>USA</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Quote Date : 25/12/2025</div>
                    <div>Expiry Date: 25/12/2025</div>
                    <div>Reference#: SO-17</div>
                    <div>Project Name: Design project</div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Description :</div>
                  <div className="text-sm text-gray-600">Description</div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold">#</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Item & Description</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">VAT</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm text-gray-700">1</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium">Brochure Design</div>
                          <div className="text-xs text-gray-500">Brochure Design Single Sided Color</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">1.00 Nos</td>
                        <td className="px-4 py-3 text-sm text-gray-700">300.00</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>21.00</div>
                          <div className="text-xs text-gray-500">7.00%</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">321.00</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm text-gray-700">2</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium">Web Design Packages(Template) - Basic</div>
                          <div className="text-xs text-gray-500">Custom Themes for your business. Inclusive of 10 hours of marketing and annual training</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">1.00 Nos</td>
                        <td className="px-4 py-3 text-sm text-gray-700">250.00</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>11.75</div>
                          <div className="text-xs text-gray-500">4.70%</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">261.75</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-700">3</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium">Print Ad - Basic - Color</div>
                          <div className="text-xs text-gray-500">Print Ad 1/8 size Color</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">1.00 Nos</td>
                        <td className="px-4 py-3 text-sm text-gray-700">80.00</td>
                        <td className="px-4 py-3 text-sm text-gray-700">-</td>
                        <td className="px-4 py-3 text-sm text-gray-700">80.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Sub Total</span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">32.75</div>
                        <div className="text-sm font-semibold text-gray-900">662.75</div>
                      </div>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="text-sm font-semibold text-gray-900">KES662.75</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Notes</div>
                  <div className="text-sm text-gray-600">Looking forward for your business.</div>
                </div>

                {/* Terms & Conditions */}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Terms & Conditions</div>
                  <div className="text-sm text-gray-600">
                    Your company's Terms and Conditions will be displayed here. You can add it in the Estimate Preferences page under Settings.
                  </div>
                </div>

                {/* Page Number */}
                <div className="text-right text-xs text-gray-500">1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

