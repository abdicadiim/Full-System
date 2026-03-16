import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, Calendar } from "lucide-react";

export default function VATPage() {
  const navigate = useNavigate();
  const [isVATRegistered, setIsVATRegistered] = useState(false);
  const [vatRegistrationLabel, setVATRegistrationLabel] = useState("PIN");
  const [vatRegistrationNumber, setVATRegistrationNumber] = useState("");
  const [internationalTrade, setInternationalTrade] = useState("Kenya");
  const [vatRegisteredOn, setVATRegisteredOn] = useState("");
  const [generateFirstTaxReturnFrom, setGenerateFirstTaxReturnFrom] = useState("");
  const [reportingPeriod, setReportingPeriod] = useState("Custom");
  const [enableInternationalTrade, setEnableInternationalTrade] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDateField, setSelectedDateField] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef(null);
  const vatRegisteredOnRef = useRef(null);
  const generateFirstTaxReturnRef = useRef(null);

  // Date picker click away
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setDatePickerOpen(false);
        setSelectedDateField(null);
      }
    };
    if (datePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [datePickerOpen]);

  const handleDateSelect = (date) => {
    const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    if (selectedDateField === "vatRegisteredOn") {
      setVATRegisteredOn(dateStr);
    } else if (selectedDateField === "generateFirstTaxReturn") {
      setGenerateFirstTaxReturnFrom(dateStr);
    }
    setDatePickerOpen(false);
    setSelectedDateField(null);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const renderDatePicker = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Previous month's trailing days
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div
        ref={datePickerRef}
        className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
        style={{
          top: selectedDateField === "vatRegisteredOn" 
            ? `${vatRegisteredOnRef.current?.getBoundingClientRect().bottom + 8}px`
            : `${generateFirstTaxReturnRef.current?.getBoundingClientRect().bottom + 8}px`,
          left: selectedDateField === "vatRegisteredOn"
            ? `${vatRegisteredOnRef.current?.getBoundingClientRect().left}px`
            : `${generateFirstTaxReturnRef.current?.getBoundingClientRect().left}px`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (month === 0) {
                setMonth(11);
                setYear(year - 1);
              } else {
                setMonth(month - 1);
              }
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12l-4-4 4-4" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">{monthNames[month]} {year}</span>
          <button
            onClick={() => {
              if (month === 11) {
                setMonth(0);
                setYear(year + 1);
              } else {
                setMonth(month + 1);
              }
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs font-semibold text-gray-600 text-center py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (d.isCurrentMonth) {
                  handleDateSelect(new Date(year, month, d.day));
                }
              }}
              className={`w-8 h-8 text-sm rounded hover:bg-gray-100 ${
                d.isCurrentMonth ? "text-gray-900" : "text-gray-400"
              } ${d.day === 25 && d.isCurrentMonth ? "bg-orange-500 text-white" : ""}`}
            >
              {d.day}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">VAT</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
          VAT Settings
        </button>
      </div>

      {/* VAT Settings Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Is your business registered for VAT? */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Is your business registered for VAT?
            </label>
            <button
              onClick={() => setIsVATRegistered(!isVATRegistered)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isVATRegistered ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isVATRegistered ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Form fields - only show when VAT is registered */}
          {isVATRegistered && (
            <>
              {/* VAT Registration Number Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Registration Number Label
                </label>
                <input
                  type="text"
                  value={vatRegistrationLabel}
                  onChange={(e) => setVATRegistrationLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* VAT Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Registration Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={vatRegistrationNumber}
                    onChange={(e) => setVATRegistrationNumber(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type the registration number"
                  />
                  <button className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Validate PIN
                  </button>
                </div>
              </div>

              {/* International Trade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  International Trade
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableInternationalTrade}
                      onChange={(e) => setEnableInternationalTrade(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Enable trade with contacts outside Kenya</span>
                  </label>
                  {enableInternationalTrade && (
                    <input
                      type="text"
                      value={internationalTrade}
                      onChange={(e) => setInternationalTrade(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* VAT Registered On */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Registered On <span className="text-red-500">*</span>
                </label>
                <div ref={vatRegisteredOnRef} className="relative">
                  <input
                    type="text"
                    value={vatRegisteredOn}
                    onChange={(e) => setVATRegisteredOn(e.target.value)}
                    onClick={() => {
                      setSelectedDateField("vatRegisteredOn");
                      setDatePickerOpen(true);
                    }}
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Select date"
                  />
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {datePickerOpen && selectedDateField === "vatRegisteredOn" && renderDatePicker()}
              </div>

              {/* Generate First Tax Return From */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  Generate First Tax Return From <span className="text-red-500">*</span>
                  <HelpCircle size={16} className="text-gray-400" />
                </label>
                <div ref={generateFirstTaxReturnRef} className="relative">
                  <input
                    type="text"
                    value={generateFirstTaxReturnFrom}
                    onChange={(e) => setGenerateFirstTaxReturnFrom(e.target.value)}
                    onClick={() => {
                      setSelectedDateField("generateFirstTaxReturn");
                      setDatePickerOpen(true);
                    }}
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Select date"
                  />
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {datePickerOpen && selectedDateField === "generateFirstTaxReturn" && renderDatePicker()}
              </div>

              {/* Reporting Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporting Period
                </label>
                <select
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Custom</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annually</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Handle save
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

