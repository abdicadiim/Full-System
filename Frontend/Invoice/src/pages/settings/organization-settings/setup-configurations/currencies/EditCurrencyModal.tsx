import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, ChevronUp, ChevronDown } from "lucide-react";

export default function EditCurrencyModal({ currency, onClose, onSave, onAddExchangeRate }) {
  const [currencyCode, setCurrencyCode] = useState(currency?.code || "");
  const [currencySymbol, setCurrencySymbol] = useState(currency?.symbol || "");
  const [currencyName, setCurrencyName] = useState(currency?.name || "");
  const [decimalPlaces, setDecimalPlaces] = useState("2");
  const [format, setFormat] = useState(currency?.format || "1,234,567.89");
  const [isBaseCurrency, setIsBaseCurrency] = useState(currency?.isBaseCurrency || false);

  const [decimalPlacesDropdownOpen, setDecimalPlacesDropdownOpen] = useState(false);
  const [decimalPlacesSearch, setDecimalPlacesSearch] = useState("");
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [formatSearch, setFormatSearch] = useState("");

  const decimalPlacesRef = useRef(null);
  const decimalPlacesDropdownRef = useRef(null);
  const formatRef = useRef(null);
  const formatDropdownRef = useRef(null);

  const decimalPlacesOptions = ["0", "2", "3", "4", "5", "6"];
  const formatOptions = [
    "1,234,567.89",
    "1.234.567,89",
    "1 234 567,89",
    "1234567.89",
    "1234567,89"
  ];

  const filteredDecimalPlaces = useMemo(() => {
    if (!decimalPlacesSearch) return decimalPlacesOptions;
    const s = decimalPlacesSearch.trim().toLowerCase();
    return decimalPlacesOptions.filter((opt) => opt.includes(s));
  }, [decimalPlacesSearch]);

  const filteredFormats = useMemo(() => {
    if (!formatSearch) return formatOptions;
    const s = formatSearch.trim().toLowerCase();
    return formatOptions.filter((opt) => opt.toLowerCase().includes(s));
  }, [formatSearch]);

  // Position calculations
  const [decimalPlacesPosition, setDecimalPlacesPosition] = useState({ top: 0, left: 0, width: 0 });
  const [formatPosition, setFormatPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (decimalPlacesDropdownOpen && decimalPlacesRef.current) {
      const rect = decimalPlacesRef.current.getBoundingClientRect();
      setDecimalPlacesPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [decimalPlacesDropdownOpen]);

  useEffect(() => {
    if (formatDropdownOpen && formatRef.current) {
      const rect = formatRef.current.getBoundingClientRect();
      setFormatPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [formatDropdownOpen]);

  // Click away handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (decimalPlacesRef.current && !decimalPlacesRef.current.contains(event.target) &&
        decimalPlacesDropdownRef.current && !decimalPlacesDropdownRef.current.contains(event.target)) {
        setDecimalPlacesDropdownOpen(false);
        setDecimalPlacesSearch("");
      }
      if (formatRef.current && !formatRef.current.contains(event.target) &&
        formatDropdownRef.current && !formatDropdownRef.current.contains(event.target)) {
        setFormatDropdownOpen(false);
        setFormatSearch("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (!currencyCode || !currencySymbol || !currencyName) {
      alert("Please fill in all required fields");
      return;
    }
    onSave({
      code: currencyCode,
      symbol: currencySymbol,
      name: currencyName,
      decimalPlaces,
      format,
      isBaseCurrency
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Currency</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} className="text-red-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Currency Code */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              Currency Code*
            </label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              Currency Symbol*
            </label>
            <input
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Currency Name */}
          <div>
            <label className="block text-sm font-medium text-red-600 mb-2">
              Currency Name*
            </label>
            <input
              type="text"
              value={currencyName}
              onChange={(e) => setCurrencyName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Decimal Places */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimal Places
            </label>
            <div className="relative" ref={decimalPlacesRef}>
              <button
                type="button"
                onClick={() => setDecimalPlacesDropdownOpen(!decimalPlacesDropdownOpen)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={decimalPlaces ? "text-gray-900" : "text-gray-400"}>
                  {decimalPlaces || "Select"}
                </span>
                {decimalPlacesDropdownOpen ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {decimalPlacesDropdownOpen && createPortal(
                <div
                  ref={decimalPlacesDropdownRef}
                  className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                  style={{
                    top: `${decimalPlacesPosition.top}px`,
                    left: `${decimalPlacesPosition.left}px`,
                    width: `${decimalPlacesPosition.width}px`,
                    zIndex: 99999,
                    maxHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                    <Search size={16} className="text-gray-400" />
                    <input
                      autoFocus
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                      placeholder="Search"
                      value={decimalPlacesSearch}
                      onChange={(e) => setDecimalPlacesSearch(e.target.value)}
                    />
                  </div>
                  <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                    {filteredDecimalPlaces.map((opt) => {
                      const isSelected = opt === decimalPlaces;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                            ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                          `}
                          onClick={() => {
                            setDecimalPlaces(opt);
                            setDecimalPlacesDropdownOpen(false);
                            setDecimalPlacesSearch("");
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {filteredDecimalPlaces.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="relative" ref={formatRef}>
              <button
                type="button"
                onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={format ? "text-gray-900" : "text-gray-400"}>
                  {format || "Select"}
                </span>
                {formatDropdownOpen ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {formatDropdownOpen && createPortal(
                <div
                  ref={formatDropdownRef}
                  className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                  style={{
                    top: `${formatPosition.top}px`,
                    left: `${formatPosition.left}px`,
                    width: `${formatPosition.width}px`,
                    zIndex: 99999,
                    maxHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-3 py-3 flex-shrink-0">
                    <Search size={16} className="text-gray-400" />
                    <input
                      autoFocus
                      className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                      placeholder="Search"
                      value={formatSearch}
                      onChange={(e) => setFormatSearch(e.target.value)}
                    />
                  </div>
                  <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                    {filteredFormats.map((opt) => {
                      const isSelected = opt === format;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                            ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                          `}
                          onClick={() => {
                            setFormat(opt);
                            setFormatDropdownOpen(false);
                            setFormatSearch("");
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {filteredFormats.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={isBaseCurrency}
                onChange={(e) => setIsBaseCurrency(e.target.checked)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all"
              />
              <svg
                className="absolute h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white stroke-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              Mark as Base Currency
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          {onAddExchangeRate && (
            <button
              onClick={onAddExchangeRate}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Add Exchange Rate
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

