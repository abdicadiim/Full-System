import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Upload, Edit2, X, Search, HelpCircle, Send, Settings as SettingsIcon } from "lucide-react";
import { TIMEZONES } from "../../../../../constants/timezones";

const API_BASE_URL = '/api';
const DEFAULT_SYSTEM_SENDER_EMAIL = "message-service@sender.tabanbooks.com";

const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing local user:', error);
    return null;
  }
};

const INDUSTRIES = [
  "Agency or Sales House",
  "Agriculture",
  "Art and Design",
  "Automotive",
  "Banking & Finance",
  "Construction",
  "Consulting",
  "Consumer Packaged Goods",
  "Education",
  "Energy & Utilities",
  "Food & Beverage",
  "Healthcare",
  "Hospitality",
  "Information Technology",
  "Manufacturing",
  "Media & Entertainment",
  "Real Estate",
  "Retail",
  "Telecommunications",
  "Transportation & Logistics",
  "Travel & Tourism",
  "Other"
];

const COUNTRIES = [
  "Aland Islands",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Ashmore and Cartier Islands",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia",
  "Bonaire, Sint Eustatius and Saba",
  "Bosnia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "British Indian Ocean Territory",
  "British Virgin Islands",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Clipperton Island",
  "Cocos Islands",
  "Colombia",
  "Comoros",
  "Congo",
  "Cook Islands",
  "Coral Sea Islands",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Curacao",
  "Cyprus",
  "Czech Republic",
  "DR Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Falkland Islands",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "French Southern Territories",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guernsey",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Heard Island and McDonald Islands",
  "High Seas",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Isle of Man",
  "Israel",
  "Italy",
  "CÃ´te d'Ivoire",
  "Jamaica",
  "Japan",
  "Jersey",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kosova Republic",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macau",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "Netherlands Antilles",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "North Korea",
  "North Macedonia",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Reunion",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Barthelemy",
  "Saint Helena",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Martin",
  "Saint Pierre and Miquelon",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Serbia and Montenegro",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Sint Maarten",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "Somaliland",
  "South Africa",
  "South Georgia and the South Sandwich Islands",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard and Jan Mayen",
  "Swaziland",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor Leste",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Turks and Caicos Islands",
  "Tuvalu",
  "U.A.E",
  "U.S.A",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States Minor Outlying Islands",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Virgin Islands, British",
  "Virgin Islands, U.S.",
  "Wallis and Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];

const CURRENCIES = [
  "SOS - Somali Shilling",
  "USD - US Dollar",
  "EUR - Euro",
  "GBP - British Pound",
  "AMD - Armenian Dram",
  "AED - UAE Dirham",
  "SAR - Saudi Riyal",
  "INR - Indian Rupee",
  "CNY - Chinese Yuan",
  "JPY - Japanese Yen"
];
const LANGUAGES = ["English", "Spanish", "French", "German", "Arabic", "Chinese", "Hindi"];
const TIME_ZONES = TIMEZONES;
const DATE_FORMATS = {
  "short": [
    "MM-dd-yy [ 12-25-25 ]",
    "dd-MM-yy [ 25-12-25 ]",
    "yy-MM-dd [ 25-12-25 ]"
  ],
  "medium": [
    "MM-dd-yyyy [ 12-25-2025 ]",
    "dd-MM-yyyy [ 25-12-2025 ]",
    "yyyy-MM-dd [ 2025-12-25 ]"
  ],
  "long": [
    "dd MMM yyyy [ 25 Dec 2025 ]",
    "dd MMMM yyyy [ 25 December 2025 ]",
    "MMMM dd, yyyy [ December 25, 2025 ]",
    "EEE, MMMM dd, yyyy [ Thu, December 25, 2025 ]",
    "EEEEEE, MMMM dd, yyyy [ Thursday, December 25, 2025 ]",
    "MMM dd, yyyy [ Dec 25, 2025 ]",
    "yyyy MM dd [ 2025 12 25 ]",
    "yyyyå¹´MMæœˆddæ—¥ [ 2025å¹´12æœˆ25æ—¥ ]"
  ]
};

// Flatten all date formats for the value
const ALL_DATE_FORMATS = [
  ...DATE_FORMATS.short,
  ...DATE_FORMATS.medium,
  ...DATE_FORMATS.long
];
const FISCAL_YEARS = ["January - December", "February - January", "March - February", "April - March"];
const START_DATES = Array.from({ length: 31 }, (_, i) => i + 1);

// Helper for click away
function useClickAway(ref, onAway, additionalRef = null) {
  useEffect(() => {
    const fn = (e) => {
      const clickedInside = ref.current?.contains(e.target) || additionalRef?.current?.contains(e.target);
      if (!clickedInside) onAway?.();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onAway, ref, additionalRef]);
}

// Searchable Dropdown Component
function SearchableDropdown({ value, placeholder, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const box = useRef(null);
  const dropdownRef = useRef(null);

  useClickAway(box, () => setOpen(false), dropdownRef);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.toLowerCase().includes(s)) : options;
  }, [options, q]);

  useEffect(() => {
    if (open && box.current) {
      const rect = box.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setPosition({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (box.current) {
        const rect = box.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 320;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setPosition({
          top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          openUpward
        });
      }
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <>
      <div ref={box} className="relative w-full">
        <button
          type="button"
          className={`h-10 w-full rounded-lg border-2 bg-white px-3 text-left text-sm font-medium flex items-center justify-between transition
            ${open ? "border-blue-500 ring-2 ring-blue-100 shadow-md" : "border-gray-300 hover:border-gray-400"}
          `}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`truncate ${value ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
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
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
            {list.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                    ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                  `}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {opt}
                </button>
              );
            })}
            {list.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Help Tooltip Component
function HelpTooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef(null);

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // 10px spacing
        left: rect.left + rect.width / 2
      });
    }
  }, [show]);

  return (
    <div
      ref={targetRef}
      className="inline-block relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div
          className="fixed z-[999999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-[#1f2937] text-white text-[13px] leading-relaxed py-3 px-4 rounded-lg shadow-xl max-w-[320px] relative font-medium text-center">
            {text}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1f2937]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Date Format Dropdown with Categories
function DateFormatDropdown({ value, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const box = useRef(null);
  const dropdownRef = useRef(null);

  useClickAway(box, () => setOpen(false), dropdownRef);

  // Filter options by search query
  const filteredCategories = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DATE_FORMATS;

    const filtered = {};
    Object.entries(DATE_FORMATS).forEach(([category, formats]) => {
      const matching = formats.filter(f => f.toLowerCase().includes(s));
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  }, [q]);

  useEffect(() => {
    if (open && box.current) {
      const rect = box.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 400;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setPosition({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (box.current) {
        const rect = box.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 400;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setPosition({
          top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          openUpward
        });
      }
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <>
      <div ref={box} className="relative w-full">
        <button
          type="button"
          className={`h-10 w-full rounded-lg border-2 bg-white px-3 text-left text-sm font-medium flex items-center justify-between transition
            ${open ? "border-blue-500 ring-2 ring-blue-100 shadow-md" : "border-gray-300 hover:border-gray-400"}
          `}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`truncate ${value ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
            {value || placeholder}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: 99999,
            maxHeight: '400px',
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
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="overflow-auto flex-1" style={{ maxHeight: '360px' }}>
            {Object.entries(filteredCategories).map(([category, formats]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-100 uppercase">
                  {category}
                </div>
                {formats.map((format) => {
                  const isSelected = format === value;
                  return (
                    <button
                      key={format}
                      type="button"
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                        ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                      `}
                      onClick={() => {
                        onChange(format);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span>{format}</span>
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13 4l-6 6-3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {Object.keys(filteredCategories).length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState(() => {
    const local = localStorage.getItem('org_profile');
    console.log("DEBUG: Local org_profile from storage:", local);
    return local ? JSON.parse(local).organizationName : "Taban enterprise";
  });

  const [industry, setIndustry] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).industry : "Agriculture";
  });
  const [location, setLocation] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).location : "Somalia";
  });

  const [email, setEmail] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).email : "";
  });
  const [primarySenderName, setPrimarySenderName] = useState(() => {
    const storedUser = getStoredUser();
    return storedUser?.name || storedUser?.fullName || "Organization Owner";
  });
  const [primarySenderEmail, setPrimarySenderEmail] = useState(() => {
    const storedUser = getStoredUser();
    return storedUser?.email || "";
  });
  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [street1, setStreet1] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).street1 : "";
  });
  const [street2, setStreet2] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).street2 : "";
  });
  const [city, setCity] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).city : "";
  });
  const [zipCode, setZipCode] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).zipCode : "";
  });
  const [state, setState] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).state : "";
  });

  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [website, setWebsite] = useState("");
  const [showPaymentStubAddress, setShowPaymentStubAddress] = useState(false);
  const [paymentStubAddress, setPaymentStubAddress] = useState("");
  const [isEditAddressModalOpen, setIsEditAddressModalOpen] = useState(false);

  // Additional fields
  const [baseCurrency, setBaseCurrency] = useState(() => {
    const local = localStorage.getItem('org_profile');
    if (local) {
      const parsed = JSON.parse(local);
      const cur = parsed.currency;
      if (cur) return cur.includes(' - ') ? cur : CURRENCIES.find(c => c.startsWith(cur)) || cur;
      return "SOS - Somali Shilling";
    }
    return "SOS - Somali Shilling";
  });
  const [fiscalYear, setFiscalYear] = useState("January - December");
  const [startDate, setStartDate] = useState("1");
  const [reportBasis, setReportBasis] = useState("Accrual");
  const [orgLanguage, setOrgLanguage] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).language : "English";
  });
  const [commLanguage, setCommLanguage] = useState("English");
  const [timeZone, setTimeZone] = useState(() => {
    const local = localStorage.getItem('org_profile');
    return local ? JSON.parse(local).timezone : "(GMT 3:00) Eastern African Time (Africa/Mogadishu)";
  });

  const [dateFormat, setDateFormat] = useState("dd-MM-yyyy [ 25-12-2025 ]");
  const [dateSeparator, setDateSeparator] = useState("-");

  // Update date format when separator changes
  const handleDateSeparatorChange = (newSeparator) => {
    setDateSeparator(newSeparator);
    // Replace all separators in the current date format
    const updatedFormat = dateFormat.replace(/[-./]/g, newSeparator);
    setDateFormat(updatedFormat);
  };
  const [companyIdType, setCompanyIdType] = useState("Company ID :");
  const [companyIdValue, setCompanyIdValue] = useState("");
  const [additionalFields, setAdditionalFields] = useState<any[]>([{ label: "Label", value: "Value" }]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Temporary state for the edit modal
  const [editStreet1, setEditStreet1] = useState(street1);
  const [editStreet2, setEditStreet2] = useState(street2);
  const [editCity, setEditCity] = useState(city);
  const [editZipCode, setEditZipCode] = useState(zipCode);
  const [editState, setEditState] = useState(state);
  const [editPhone, setEditPhone] = useState(phone);
  const [editFax, setEditFax] = useState(fax);

  const handleOpenEditModal = () => {
    setEditStreet1(street1);
    setEditStreet2(street2);
    setEditCity(city);
    setEditZipCode(zipCode);
    setEditState(state);
    setEditPhone(phone);
    setEditFax(fax);
    setIsEditAddressModalOpen(true);
  };

  const handleSaveAddress = () => {
    setStreet1(editStreet1);
    setStreet2(editStreet2);
    setCity(editCity);
    setZipCode(editZipCode);
    setState(editState);
    setPhone(editPhone);
    setFax(editFax);
    setIsEditAddressModalOpen(false);
  };

  const handleAddField = () => {
    setAdditionalFields([...additionalFields, { label: "", value: "" }]);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...additionalFields];
    updated[index][field] = value;
    setAdditionalFields(updated);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (jpg, jpeg, png, gif, bmp)');
        return;
      }

      // Validate file size (1MB = 1048576 bytes)
      if (file.size > 1048576) {
        alert('File size must be less than 1MB');
        return;
      }

      setLogoImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = (e) => {
    e.stopPropagation();
    setLogoImage(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenOrganizationAddressFormat = () => {
    navigate("/settings/general#organization-address-format");
  };

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      // Priority 1: Load from local storage (onboarding data)
      const localData = localStorage.getItem('org_profile');
      if (localData) {
        try {
          const lp = JSON.parse(localData);
          if (lp.organizationName) setOrgName(lp.organizationName);
          if (lp.industry) setIndustry(lp.industry);
          if (lp.location) setLocation(lp.location);
          if (lp.street1) setStreet1(lp.street1);
          if (lp.street2) setStreet2(lp.street2);
          if (lp.city) setCity(lp.city);
          if (lp.zipCode) setZipCode(lp.zipCode);
          if (lp.state) setState(lp.state);
          if (lp.currency) setBaseCurrency(lp.currency.split(' - ')[0]);
          if (lp.language) setOrgLanguage(lp.language);
          if (lp.timezone) setTimeZone(lp.timezone);
        } catch (e) {
          console.error('Error parsing local org profile:', e);
        }
      }

      // Priority 2: Load from server and merge
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/settings/organization/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const p = data.data;
            // Only update if server has non-empty values
            if (p.name && p.name !== "Taban enterprise") setOrgName(p.name);
            if (p.industry) setIndustry(p.industry);
            if (p.address?.country) setLocation(p.address.country);
            if (p.website) setWebsite(p.website);
            if (p.baseCurrency) setBaseCurrency(CURRENCIES.find(c => c.startsWith(p.baseCurrency)) || p.baseCurrency);
            if (p.fiscalYear) setFiscalYear(p.fiscalYear);
            if (p.reportBasis) setReportBasis(p.reportBasis);
            if (p.orgLanguage) setOrgLanguage(p.orgLanguage);
            if (p.commLanguage) setCommLanguage(p.commLanguage);
            if (p.timeZone) setTimeZone(p.timeZone);
            if (p.dateFormat) setDateFormat(p.dateFormat);
            if (p.dateSeparator) setDateSeparator(p.dateSeparator);

            if (p.address) {
              if (p.address.street1) setStreet1(p.address.street1);
              if (p.address.street2) setStreet2(p.address.street2);
              if (p.address.city) setCity(p.address.city);
              if (p.address.zipCode) setZipCode(p.address.zipCode);
              if (p.address.state) setState(p.address.state);
              if (p.address.phone) setPhone(p.address.phone);
              if (p.address.fax) setFax(p.address.fax);
            }

            if (p.logo) {
              setLogoPreview(p.logo);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadPrimarySender = async () => {
      try {
        const storedUser = getStoredUser();
        if (storedUser?.name || storedUser?.fullName) {
          setPrimarySenderName(storedUser.name || storedUser.fullName);
        }
        if (storedUser?.email) {
          setPrimarySenderEmail(storedUser.email);
        }

        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/settings/sender-emails/primary`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data?.success && data?.data) {
          if (data.data.name) setPrimarySenderName(data.data.name);
          if (data.data.email) setPrimarySenderEmail(data.data.email);
        }
      } catch (error) {
        console.error('Error loading primary sender:', error);
      }
    };

    loadPrimarySender();
  }, []);

  // Save profile function
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setSaveMessage({ type: 'error', text: 'Not authenticated. Please login again.' });
        setIsSaving(false);
        return;
      }

      // Convert logo to base64 if image file is selected
      let logoBase64 = logoPreview || "";
      if (logoImage) {
        try {
          const reader = new FileReader();
          logoBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result;
              // Check if result is too large (limit to 5MB for base64)
              if (result && (result as string).length > 5000000) {
                reject(new Error('Logo file is too large. Please use an image smaller than 1MB.'));
              } else {
                resolve(result);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(logoImage);
          });
        } catch (logoError: any) {
          setSaveMessage({
            type: 'error',
            text: logoError.message || 'Error processing logo image.'
          });
          setIsSaving(false);
          return;
        }
      }

      // Convert fiscalYear and startDate to a Date object
      const startMonthName = fiscalYear.split(' - ')[0];
      const monthMap: { [key: string]: number } = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const monthIdx = monthMap[startMonthName] || 0;
      const fStartDate = new Date(new Date().getFullYear(), monthIdx, parseInt(startDate) || 1);

      const profileData = {
        name: orgName,
        industry: industry,
        email: email,
        website: website,
        logo: logoBase64,
        address: {
          street1: street1,
          street2: street2,
          city: city,
          zipCode: zipCode,
          state: state,
          country: location,
          phone: phone,
          fax: fax,
        },
        baseCurrency: baseCurrency.split(' - ')[0],
        fiscalYear: fiscalYear,
        fiscalYearStart: fStartDate.toISOString(),
        reportBasis: reportBasis,
        orgLanguage: orgLanguage,
        commLanguage: commLanguage,
        timeZone: timeZone,
        dateFormat: dateFormat,
        dateSeparator: dateSeparator,
        companyIdType: companyIdType,
        companyIdValue: companyIdValue,
        additionalFields: additionalFields,
        paymentStubAddress: paymentStubAddress,
        showPaymentStubAddress: showPaymentStubAddress,
      };

      console.log('Saving profile data:', profileData);

      const response = await fetch(`${API_BASE_URL}/settings/organization/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      // Check if response has content before parsing
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            setSaveMessage({
              type: 'error',
              text: 'Invalid response from server. Please try again.'
            });
            setIsSaving(false);
            return;
          }
        } else {
          data = { success: false, message: 'Empty response from server' };
        }
      } else {
        const text = await response.text();
        setSaveMessage({
          type: 'error',
          text: text || `Server error: ${response.status} ${response.statusText}`
        });
        setIsSaving(false);
        return;
      }

      if (response.ok && data.success) {
        setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to save profile. Please try again.'
        });
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while saving. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFiscalPeriod = () => {
    if (fiscalYear === "January - December") {
      return "31 December - 30 December";
    }
    return "Period calculation";
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">Organization Profile</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            ID: 907496461
          </span>
        </div>
      </div>

      {/* Organization Logo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div
              className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition relative"
              onClick={handleLogoClick}
            >
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Organization Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    title="Remove logo"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded text-center">
                    Click to change
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600 text-center px-2">Upload Your Organization Logo</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-4">
              This logo will be displayed in transaction PDFs and email notifications.
            </p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI</p>
              <p>Supported Files: jpg, jpeg, png, gif, bmp</p>
              <p>Maximum File Size: 1MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry <span className="text-red-500">*</span> <HelpTooltip text="Select your industry type to help us fine-tune your experience. If you can't find your industry type from the list of options, you can input your own.">
                <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
              </HelpTooltip>
            </label>
            <SearchableDropdown
              value={industry}
              placeholder="Select Industry"
              options={INDUSTRIES}
              onChange={setIndustry}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Location <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              value={location}
              placeholder="Select Country"
              options={COUNTRIES}
              onChange={setLocation}
            />
          </div>
        </div>
      </div>

      {/* Organization Address */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Organization Address <HelpTooltip text="You can display your organization's address in your preferred style. Edit it in Settings > Preferences > General.">
              <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
            </HelpTooltip>
          </label>
          <button
            onClick={handleOpenEditModal}
            className="p-1 hover:bg-gray-100 rounded transition"
            title="Edit Address"
          >
            <Edit2 size={16} className="text-blue-600" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street 1</label>
            <input
              type="text"
              value={street1}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street 2</label>
            <input
              type="text"
              value={street2}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={city}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
            <input
              type="text"
              value={zipCode}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State/Province <span className="text-red-500">*</span>
            </label>
            <select
              value={state}
              disabled
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            >
              <option value="">Select</option>
              {state && <option value={state}>{state}</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="text"
              value={phone}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fax Number</label>
            <input
              type="text"
              value={fax}
              readOnly
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleOpenOrganizationAddressFormat}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Organization Address Format &gt;
          </button>
        </div>
      </div>

      {/* Website URL */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website URL"
          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Payment Stub Address Toggle */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Would you like to add a different address for payment stubs?
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${showPaymentStubAddress ? 'text-gray-600' : 'text-blue-600'}`}>
              {showPaymentStubAddress ? 'Yes' : 'No'}
            </span>
            <button
              onClick={() => setShowPaymentStubAddress(!showPaymentStubAddress)}
              className={`relative w-12 h-6 rounded-full transition-colors ${showPaymentStubAddress ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showPaymentStubAddress ? 'translate-x-6' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Stub Address */}
      {
        showPaymentStubAddress && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Stub Address <HelpTooltip text="This address will be displayed on payment stubs. You can view this by enabling Payment Stub in Templates.">
                <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
              </HelpTooltip>
            </label>
            <textarea
              value={paymentStubAddress}
              onChange={(e) => setPaymentStubAddress(e.target.value)}
              placeholder="You can enter a maximum of 255 characters"
              rows={4}
              maxLength={255}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )
      }

      {/* Primary Contact */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h2>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Send size={16} className="text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">SENDER</span>
            </div>
            <div className="text-sm font-medium text-gray-900">{primarySenderName || "Organization Owner"}</div>
            <div className="text-sm text-gray-600">({primarySenderEmail || email || "No email"})</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SettingsIcon size={16} className="text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">EMAILS ARE SENT THROUGH</span>
            </div>
            <div className="text-sm font-medium text-gray-900">Email address of Taban Books</div>
            <div className="text-sm text-gray-600">({DEFAULT_SYSTEM_SENDER_EMAIL})</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <HelpCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            Your primary contact's email address belongs to a public domain. So, emails will be sent from {DEFAULT_SYSTEM_SENDER_EMAIL} to prevent them from landing in the Spam folder. If you still want to send emails using the public domain, <button className="text-blue-600 hover:underline">change setting</button> &gt;
          </div>
        </div>
      </div>

      {/* Base Currency */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Base Currency <HelpTooltip text="Your transactions and financial reports will be shown in the base currency.">
              <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
            </HelpTooltip>
          </label>
          <button className="p-1 hover:bg-gray-100 rounded">
            <SettingsIcon size={16} className="text-gray-600" />
          </button>
        </div>
        <SearchableDropdown
          value={baseCurrency}
          placeholder="Select Currency"
          options={CURRENCIES}
          onChange={setBaseCurrency}
        />
      </div>

      {/* Fiscal Year */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year</label>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <SearchableDropdown
            value={fiscalYear}
            placeholder="Select Fiscal Year"
            options={FISCAL_YEARS}
            onChange={setFiscalYear}
          />
          <SearchableDropdown
            value={startDate}
            placeholder="Start Date"
            options={START_DATES.map(d => d.toString())}
            onChange={setStartDate}
          />
        </div>
        <div className="text-sm text-gray-600 mt-2">Period: {getFiscalPeriod()}</div>
      </div>

      {/* Report Basis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Report Basis</label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="reportBasis"
              value="Accrual"
              checked={reportBasis === "Accrual"}
              onChange={(e) => setReportBasis(e.target.value)}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Accrual</div>
              <div className="text-xs text-gray-600">You owe tax as of invoice date</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="reportBasis"
              value="Cash"
              checked={reportBasis === "Cash"}
              onChange={(e) => setReportBasis(e.target.value)}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Cash</div>
              <div className="text-xs text-gray-600">You owe tax upon payment receipt</div>
            </div>
          </label>
        </div>
      </div>

      {/* Organization Language */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization Language <HelpTooltip text="Any change in the language will not be reflected in Chart of Accounts, Email Templates, Template Customizations, Payment Modes and Default tax Rates. These will still remain in the language selected during this organization's setup.">
            <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
          </HelpTooltip>
        </label>
        <SearchableDropdown
          value={orgLanguage}
          placeholder="Select Language"
          options={LANGUAGES}
          onChange={setOrgLanguage}
        />
      </div>

      {/* Communication Languages */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Communication Languages <HelpTooltip text="Select the languages in which users can create email templates and send emails to customers and vendors.">
            <HelpCircle size={14} className="inline text-gray-400 cursor-help" />
          </HelpTooltip>
        </label>
        <SearchableDropdown
          value={commLanguage}
          placeholder="Select Language"
          options={LANGUAGES}
          onChange={setCommLanguage}
        />
      </div>

      {/* Time Zone */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
        <SearchableDropdown
          value={timeZone}
          placeholder="Select Time Zone"
          options={TIME_ZONES}
          onChange={setTimeZone}
        />
      </div>

      {/* Date Format */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
        <div className="grid grid-cols-2 gap-4">
          <DateFormatDropdown
            value={dateFormat}
            placeholder="Select Date Format"
            onChange={setDateFormat}
          />
          <SearchableDropdown
            value={dateSeparator}
            placeholder="-"
            options={[".", "-", "/"]}
            onChange={handleDateSeparatorChange}
          />
        </div>
      </div>

      {/* Company ID */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Company ID</label>
        <div className="grid grid-cols-2 gap-4">
          <SearchableDropdown
            value={companyIdType}
            placeholder="Select Type"
            options={["ACN", "BN", "CN", "CPR", "CVR", "DIW", "KT", "ORG", "SEC", "CRN", "Company ID :"]}
            onChange={setCompanyIdType}
          />
          <input
            type="text"
            value={companyIdValue}
            onChange={(e) => setCompanyIdValue(e.target.value)}
            placeholder="Enter Company ID"
            className="h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Additional Fields */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Additional Fields</h3>
        <div className="mb-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-semibold text-gray-700 uppercase">LABEL NAME</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-700 uppercase">VALUE</th>
              </tr>
            </thead>
            <tbody>
              {additionalFields.map((field, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={handleAddField}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <span className="text-lg">+</span> New Field
        </button>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <HelpCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            You can include the Company ID and additional fields in your organization address which will be displayed in your transaction PDFs. Configure this by selecting the required placeholders in your{" "}
            <button
              type="button"
              onClick={handleOpenOrganizationAddressFormat}
              className="text-blue-600 hover:underline"
            >
              Organization Address Format
            </button>.
          </div>
        </div>
      </div>

      {/* Save Message */}
      {
        saveMessage && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${saveMessage.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
            }`}>
            {saveMessage.text}
          </div>
        )
      }

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Edit Address Modal */}
      {
        isEditAddressModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={() => setIsEditAddressModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Edit2 size={18} className="text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Edit Organization Address</h3>
                </div>
                <button
                  onClick={() => setIsEditAddressModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={editStreet1}
                    onChange={(e) => setEditStreet1(e.target.value)}
                    placeholder="Street 1"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <input
                    type="text"
                    value={editStreet2}
                    onChange={(e) => setEditStreet2(e.target.value)}
                    placeholder="Street 2"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="City"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                  <input
                    type="text"
                    value={editZipCode}
                    onChange={(e) => setEditZipCode(e.target.value)}
                    placeholder="ZIP/Postal Code"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/County
                  </label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">State/Province *</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fax Number</label>
                  <input
                    type="text"
                    value={editFax}
                    onChange={(e) => setEditFax(e.target.value)}
                    placeholder="Fax Number"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <button
                  onClick={() => setIsEditAddressModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

