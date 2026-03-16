import React, { useState } from 'react';
import { Settings, Edit3, Eye, Copy, X, Plus, CreditCard, ChevronDown, HelpCircle } from 'lucide-react';

const CheckoutConfigurator = () => {
  const [label, setLabel] = useState('Subscribe');
  const [color, setColor] = useState('#f4ca71');
  const [plan, setPlan] = useState('SFBVFV');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-700">
      {/* Top Header Bar - Fixed at top */}
      <header className="flex items-center justify-between bg-white px-8 py-4 border-b shrink-0">
        <h1 className="text-xl font-medium text-gray-800">Checkout Button</h1>
        <div className="flex items-center gap-6">
          <button className="bg-[#41c38c] hover:bg-[#36a878] text-white px-5 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <Copy size={16} /> Copy Code
          </button>
          <button className="text-blue-500 text-sm font-semibold hover:underline">Show Code</button>
          <X className="text-gray-400 cursor-pointer hover:text-gray-600 ml-2" size={24} />
        </div>
      </header>

      {/* Main Content - Centered in the remaining viewport */}
      <main className="flex-grow flex items-center justify-center p-12">
        <div className="flex flex-col lg:flex-row gap-10 items-center w-full max-w-[1400px]">

          {/* Left Panel: Configuration (Wider and Taller) */}
          <div className="flex-grow flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm min-h-[500px]">
            {/* Customize Column */}
            <div className="w-1/2 p-10 border-r border-gray-100">
              <div className="flex items-center gap-3 mb-8 text-gray-400 uppercase text-xs font-bold tracking-widest">
                <Edit3 size={16} /> Customize Button
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Button Style</label>
                  <div className="flex items-center justify-between bg-[#f9fafb] p-4 border border-gray-200 rounded-md text-sm">
                    <span className="text-blue-900 font-medium border-l-2 border-blue-500 pl-3">Button 1</span>
                    <button className="text-blue-500 font-bold hover:text-blue-700">Change</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Button Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Button Color</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                    />
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded border border-gray-300 cursor-pointer shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configure Plans Column */}
            <div className="w-1/2 p-10">
              <div className="flex items-center gap-3 mb-8 text-gray-400 uppercase text-xs font-bold tracking-widest">
                <Settings size={16} /> Configure Plans
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Plan</label>
                  <div className="relative">
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-md bg-white outline-none appearance-none cursor-pointer pr-10"
                    >
                      <option value="SFBVFV">SFBVFV</option>
                      <option value="PREMIUM">PREMIUM-PLAN</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-400"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Addons</label>
                  <div className="bg-[#f9fafb] border border-dashed border-gray-300 rounded-md py-12 text-center">
                    <span className="text-gray-400 text-sm font-medium">No Addons Associated</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="mt-4 text-blue-500 text-sm font-bold flex items-center gap-1.5 hover:text-blue-700 active:opacity-70 transition-colors"
                  >
                    <Plus size={18} /> Click to associate addons
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Large Arrow Spacer */}
          <div className="hidden lg:flex items-center">
            <div className="w-8 h-8 border-t-4 border-r-4 border-gray-200 rotate-45 rounded-sm" />
          </div>

          {/* Right Panel: Preview (Larger Square) */}
          <div className="w-full lg:w-[500px] h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 p-5 border-b border-gray-100 text-gray-400 uppercase text-xs font-bold tracking-widest">
              <Eye size={16} /> Preview
            </div>
            <div className="flex-grow flex items-center justify-center bg-white">
              <button
                style={{
                  borderColor: color,
                  color: color,
                  backgroundColor: 'white'
                }}
                className="px-8 py-2.5 border-2 rounded-md font-bold text-sm transition-transform active:scale-95 shadow-sm"
              >
                {label}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Associate Addons Sidebar */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Panel */}
          <div className="fixed top-0 right-0 w-[420px] h-full bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-800">Associate Addons</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-grow overflow-y-auto p-6">
              {/* Plan Info Card */}
              <div className="bg-[#f8fafc] border border-gray-100 rounded-lg p-5 mb-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100/50 rounded flex items-center justify-center text-blue-600">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-[15px]">{plan}</h3>
                      <p className="text-gray-400 text-xs mt-1">Plan Code: DV</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">AMD2.00</div>
                    <div className="text-gray-400 text-[11px] mt-0.5 uppercase tracking-wide">per month</div>
                  </div>
                </div>
                <button className="flex items-center gap-1 mt-4 text-blue-500 text-xs font-bold hover:underline ml-auto">
                  View More <ChevronDown size={14} />
                </button>
              </div>

              {/* Addons List */}
              <div className="flex flex-col h-[calc(100%-180px)]">
                {/* List Header */}
                <div className="flex items-center justify-between px-2 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 rounded-t-md">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-not-allowed" disabled />
                    <span>ADDON</span>
                  </div>
                  <span>QTY</span>
                </div>

                {/* Empty State Message */}
                <div className="flex-grow flex flex-col items-center justify-center px-8 text-center mt-10">
                  <p className="text-[13px] text-gray-500 leading-relaxed max-w-[280px]">
                    You haven't configured any addons to be included in this product's Embed Widget.
                    <HelpCircle size={14} className="inline-block ml-1 text-gray-300 cursor-help" />
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t flex items-center gap-3 bg-gray-50/30">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="bg-[#22b573] hover:bg-[#1da467] text-white px-6 py-2 rounded text-xs font-bold transition-colors shadow-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="bg-white border border-gray-200 text-gray-500 px-6 py-2 rounded text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CheckoutConfigurator;