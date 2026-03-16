import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, ChevronUp, ChevronDown } from "lucide-react";

interface NewCurrencyModalProps {
  onClose: () => void;
  onSave: (data: {
    code: string;
    symbol: string;
    name: string;
    decimalPlaces: string;
    format: string;
    isBaseCurrency: boolean;
  }) => void;
}

export default function NewCurrencyModal({ onClose, onSave }: NewCurrencyModalProps) {
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState("");
  const [format, setFormat] = useState("");
  const [isBaseCurrency, setIsBaseCurrency] = useState(false);

  const [currencyCodeDropdownOpen, setCurrencyCodeDropdownOpen] = useState(false);
  const [currencyCodeSearch, setCurrencyCodeSearch] = useState("");
  const [decimalPlacesDropdownOpen, setDecimalPlacesDropdownOpen] = useState(false);
  const [decimalPlacesSearch, setDecimalPlacesSearch] = useState("");
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [formatSearch, setFormatSearch] = useState("");

  const currencyCodeRef = useRef<HTMLDivElement>(null);
  const currencyCodeDropdownRef = useRef<HTMLDivElement>(null);
  const decimalPlacesRef = useRef<HTMLDivElement>(null);
  const decimalPlacesDropdownRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);

  // Currency data mapping with symbol, name, decimal places, and format
  const currencyData: Record<string, { symbol: string; name: string; decimals: string; format: string }> = {
    "AED": { symbol: "د.إ", name: "UAE Dirham", decimals: "2", format: "1,234,567.89" },
    "AFN": { symbol: "؋", name: "Afghan Afghani", decimals: "2", format: "1,234,567.89" },
    "ALL": { symbol: "L", name: "Albanian Lek", decimals: "2", format: "1,234,567.89" },
    "AMD": { symbol: "֏", name: "Armenian Dram", decimals: "2", format: "1,234,567.89" },
    "ANG": { symbol: "ƒ", name: "Netherlands Antillian Guilder", decimals: "2", format: "1,234,567.89" },
    "AOA": { symbol: "Kz", name: "Angolan Kwanza", decimals: "2", format: "1,234,567.89" },
    "ARS": { symbol: "$", name: "Argentine Peso", decimals: "2", format: "1,234,567.89" },
    "AUD": { symbol: "$", name: "Australian Dollar", decimals: "2", format: "1,234,567.89" },
    "AWG": { symbol: "ƒ", name: "Aruban Guilder", decimals: "2", format: "1,234,567.89" },
    "AZN": { symbol: "₼", name: "Azerbaijanian Manat", decimals: "2", format: "1,234,567.89" },
    "BAM": { symbol: "КМ", name: "Bosnia and Herzegovina Convertible Marks", decimals: "2", format: "1,234,567.89" },
    "BBD": { symbol: "$", name: "Barbadian Dollar", decimals: "2", format: "1,234,567.89" },
    "BDT": { symbol: "৳", name: "Bangladeshi Taka", decimals: "2", format: "1,234,567.89" },
    "BGN": { symbol: "лв", name: "Bulgarian Lev", decimals: "2", format: "1,234,567.89" },
    "BHD": { symbol: ".د.ب", name: "Bahraini Dinar", decimals: "3", format: "1,234,567.89" },
    "BIF": { symbol: "Fr", name: "Burundian Franc", decimals: "0", format: "1,234,567" },
    "BMD": { symbol: "$", name: "Bermudian Dollar (Bermuda Dollar)", decimals: "2", format: "1,234,567.89" },
    "BND": { symbol: "$", name: "Brunei Dollar", decimals: "2", format: "1,234,567.89" },
    "BOB": { symbol: "Bs.", name: "Bolivian Boliviano", decimals: "2", format: "1,234,567.89" },
    "BOV": { symbol: "BOV", name: "Mvdol", decimals: "2", format: "1,234,567.89" },
    "BRL": { symbol: "R$", name: "Brazilian Real", decimals: "2", format: "1.234.567,89" },
    "BSD": { symbol: "$", name: "Bahamian Dollar", decimals: "2", format: "1,234,567.89" },
    "BTN": { symbol: "Nu.", name: "Bhutanese Ngultrum", decimals: "2", format: "1,234,567.89" },
    "BWP": { symbol: "P", name: "Botswana Pula", decimals: "2", format: "1,234,567.89" },
    "BYN": { symbol: "Br", name: "Belarussian Ruble", decimals: "2", format: "1,234,567.89" },
    "BZD": { symbol: "$", name: "Belize Dollar", decimals: "2", format: "1,234,567.89" },
    "CAD": { symbol: "$", name: "Canadian Dollar", decimals: "2", format: "1,234,567.89" },
    "CDF": { symbol: "Fr", name: "Congolese franc", decimals: "2", format: "1,234,567.89" },
    "CHE": { symbol: "CHE", name: "WIR Euro", decimals: "2", format: "1,234,567.89" },
    "CHF": { symbol: "Fr", name: "Swiss Franc", decimals: "2", format: "1,234,567.89" },
    "CHW": { symbol: "CHW", name: "WIR Franc", decimals: "2", format: "1,234,567.89" },
    "CLF": { symbol: "CLF", name: "Chilean Unidades de formento", decimals: "4", format: "1,234,567.89" },
    "CLP": { symbol: "$", name: "Chilean Peso", decimals: "0", format: "1,234,567" },
    "CNY": { symbol: "¥", name: "Yuan Renminbi", decimals: "2", format: "1,234,567.89" },
    "COP": { symbol: "$", name: "Colombian Peso", decimals: "2", format: "1,234,567.89" },
    "COU": { symbol: "COU", name: "Unidad de Valor Real", decimals: "2", format: "1,234,567.89" },
    "CRC": { symbol: "₡", name: "Costa Rican Colon", decimals: "2", format: "1,234,567.89" },
    "CUC": { symbol: "$", name: "Cuban Convertible Peso", decimals: "2", format: "1,234,567.89" },
    "CUP": { symbol: "$", name: "Cuban Peso", decimals: "2", format: "1,234,567.89" },
    "CVE": { symbol: "$", name: "Cape Verdean Escudo", decimals: "2", format: "1,234,567.89" },
    "CZK": { symbol: "Kč", name: "Czech Koruna", decimals: "2", format: "1,234,567.89" },
    "DJF": { symbol: "Fr", name: "Djiboutian Franc", decimals: "0", format: "1,234,567" },
    "DKK": { symbol: "kr", name: "Danish Krone", decimals: "2", format: "1,234,567.89" },
    "DOP": { symbol: "$", name: "Dominican Peso", decimals: "2", format: "1,234,567.89" },
    "DZD": { symbol: "د.ج", name: "Algerian Dinar", decimals: "2", format: "1,234,567.89" },
    "EGP": { symbol: "£", name: "Egyptian Pound", decimals: "2", format: "1,234,567.89" },
    "ERN": { symbol: "Nfk", name: "Eritrean Nakfa", decimals: "2", format: "1,234,567.89" },
    "ETB": { symbol: "Br", name: "Ethiopian Birr", decimals: "2", format: "1,234,567.89" },
    "EUR": { symbol: "€", name: "Euro", decimals: "2", format: "1.234.567,89" },
    "FJD": { symbol: "$", name: "Fijian Dollar", decimals: "2", format: "1,234,567.89" },
    "FKP": { symbol: "£", name: "Falkland Islands Pound", decimals: "2", format: "1,234,567.89" },
    "GBP": { symbol: "£", name: "Pound Sterling", decimals: "2", format: "1,234,567.89" },
    "GEL": { symbol: "₾", name: "Georgian Lari", decimals: "2", format: "1,234,567.89" },
    "GGP": { symbol: "£", name: "Guernsey Pound", decimals: "2", format: "1,234,567.89" },
    "GHS": { symbol: "₵", name: "Ghanaian Cedi", decimals: "2", format: "1,234,567.89" },
    "GIP": { symbol: "£", name: "Gibraltar Pound", decimals: "2", format: "1,234,567.89" },
    "GMD": { symbol: "D", name: "Gambian Dalasi", decimals: "2", format: "1,234,567.89" },
    "GNF": { symbol: "Fr", name: "Guinean Franc", decimals: "0", format: "1,234,567" },
    "GTQ": { symbol: "Q", name: "Guatemalan Quetzal", decimals: "2", format: "1,234,567.89" },
    "GYD": { symbol: "$", name: "Guyanese Dollar", decimals: "2", format: "1,234,567.89" },
    "HKD": { symbol: "$", name: "Hong Kong Dollar", decimals: "2", format: "1,234,567.89" },
    "HNL": { symbol: "L", name: "Honduran Lempira", decimals: "2", format: "1,234,567.89" },
    "HRK": { symbol: "kn", name: "Croatian Kuna", decimals: "2", format: "1,234,567.89" },
    "HTG": { symbol: "G", name: "Haitian Gourde", decimals: "2", format: "1,234,567.89" },
    "HUF": { symbol: "Ft", name: "Hungarian Forint", decimals: "2", format: "1,234,567.89" },
    "IDR": { symbol: "Rp", name: "Indonesian Rupiah", decimals: "2", format: "1,234,567.89" },
    "ILS": { symbol: "₪", name: "Israeli new shekel", decimals: "2", format: "1,234,567.89" },
    "IMP": { symbol: "£", name: "Manx Pound", decimals: "2", format: "1,234,567.89" },
    "INR": { symbol: "₹", name: "Indian Rupee", decimals: "2", format: "1,234,567.89" },
    "IQD": { symbol: "ع.د", name: "Iraqi Dinar", decimals: "3", format: "1,234,567.89" },
    "IRR": { symbol: "﷼", name: "Iranian Rial", decimals: "2", format: "1,234,567.89" },
    "ISK": { symbol: "kr", name: "Icelandic Krona", decimals: "0", format: "1,234,567" },
    "JEP": { symbol: "£", name: "Jersey Pound", decimals: "2", format: "1,234,567.89" },
    "JMD": { symbol: "$", name: "Jamaican Dollar", decimals: "2", format: "1,234,567.89" },
    "JOD": { symbol: "د.ا", name: "Jordanian Dinar", decimals: "3", format: "1,234,567.89" },
    "JPY": { symbol: "¥", name: "Japanese Yen", decimals: "0", format: "1,234,567" },
    "KES": { symbol: "Sh", name: "Kenyan Shilling", decimals: "2", format: "1,234,567.89" },
    "KGS": { symbol: "с", name: "Kyrgyzstani Som", decimals: "2", format: "1,234,567.89" },
    "KHR": { symbol: "៛", name: "Cambodian Riel", decimals: "2", format: "1,234,567.89" },
    "KMF": { symbol: "Fr", name: "Comorian Franc", decimals: "0", format: "1,234,567" },
    "KPW": { symbol: "₩", name: "North Korean Won", decimals: "2", format: "1,234,567.89" },
    "KRW": { symbol: "₩", name: "South Korean Won", decimals: "0", format: "1,234,567" },
    "KWD": { symbol: "د.ك", name: "Kuwaiti Dinar", decimals: "3", format: "1,234,567.89" },
    "KYD": { symbol: "$", name: "Cayman Islands Dollar", decimals: "2", format: "1,234,567.89" },
    "KZT": { symbol: "₸", name: "Kazakhstani Tenge", decimals: "2", format: "1,234,567.89" },
    "LAK": { symbol: "₭", name: "Lao Kip", decimals: "2", format: "1,234,567.89" },
    "LBP": { symbol: "ل.ل", name: "Lebanese Pound", decimals: "2", format: "1,234,567.89" },
    "LKR": { symbol: "Rs", name: "Sri Lankan Rupee", decimals: "2", format: "1,234,567.89" },
    "LRD": { symbol: "$", name: "Liberian Dollar", decimals: "2", format: "1,234,567.89" },
    "LSL": { symbol: "L", name: "Lesotho Loti", decimals: "2", format: "1,234,567.89" },
    "LYD": { symbol: "ل.د", name: "Libyan Dinar", decimals: "3", format: "1,234,567.89" },
    "MAD": { symbol: "د.م.", name: "Moroccan Dirham", decimals: "2", format: "1,234,567.89" },
    "MDL": { symbol: "L", name: "Moldovan Leu", decimals: "2", format: "1,234,567.89" },
    "MGA": { symbol: "Ar", name: "Malagascy Ariary", decimals: "2", format: "1,234,567.89" },
    "MKD": { symbol: "ден", name: "Macedonian Denar", decimals: "2", format: "1,234,567.89" },
    "MMK": { symbol: "K", name: "Burmese Kyat", decimals: "2", format: "1,234,567.89" },
    "MNT": { symbol: "₮", name: "Mongolian Tugrik", decimals: "2", format: "1,234,567.89" },
    "MOP": { symbol: "P", name: "Macanese Pataca", decimals: "2", format: "1,234,567.89" },
    "MRO": { symbol: "UM", name: "Ouguiya", decimals: "2", format: "1,234,567.89" },
    "MRU": { symbol: "UM", name: "Ouguiya", decimals: "2", format: "1,234,567.89" },
    "MUR": { symbol: "₨", name: "Mauritian Rupee", decimals: "2", format: "1,234,567.89" },
    "MVR": { symbol: "Rf", name: "Maldivian Rufiyaa", decimals: "2", format: "1,234,567.89" },
    "MWK": { symbol: "MK", name: "Malawian Kwacha", decimals: "2", format: "1,234,567.89" },
    "MXN": { symbol: "$", name: "Mexican Peso", decimals: "2", format: "1,234,567.89" },
    "MXV": { symbol: "MXV", name: "Mexican Unidad de Inversion (UID)", decimals: "2", format: "1,234,567.89" },
    "MYR": { symbol: "RM", name: "Malaysian Ringgit", decimals: "2", format: "1,234,567.89" },
    "MZN": { symbol: "MT", name: "Mozambican Metical", decimals: "2", format: "1,234,567.89" },
    "NAD": { symbol: "$", name: "Namibian Dollar", decimals: "2", format: "1,234,567.89" },
    "NGN": { symbol: "₦", name: "Nigerian Naira", decimals: "2", format: "1,234,567.89" },
    "NIO": { symbol: "C$", name: "Nicaraguan Cordoba Oro", decimals: "2", format: "1,234,567.89" },
    "NOK": { symbol: "kr", name: "Norwegian Krone", decimals: "2", format: "1,234,567.89" },
    "NPR": { symbol: "₨", name: "Nepalese Rupee", decimals: "2", format: "1,234,567.89" },
    "NZD": { symbol: "$", name: "New Zealand Dollar", decimals: "2", format: "1,234,567.89" },
    "OMR": { symbol: "﷼", name: "Omani rial", decimals: "3", format: "1,234,567.89" },
    "PAB": { symbol: "B/.", name: "Panamanian Balboa", decimals: "2", format: "1,234,567.89" },
    "PEN": { symbol: "S/.", name: "Peruvian Nuevo Sol", decimals: "2", format: "1,234,567.89" },
    "PGK": { symbol: "K", name: "Papua New Guinean Kina", decimals: "2", format: "1,234,567.89" },
    "PHP": { symbol: "₱", name: "Philippine Peso", decimals: "2", format: "1,234,567.89" },
    "PKR": { symbol: "₨", name: "Pakistani Rupee", decimals: "2", format: "1,234,567.89" },
    "PLN": { symbol: "zł", name: "Polish Zloty", decimals: "2", format: "1,234,567.89" },
    "PYG": { symbol: "₲", name: "Paraguayan Guarani", decimals: "0", format: "1,234,567" },
    "QAR": { symbol: "﷼", name: "Qatari Riyal", decimals: "2", format: "1,234,567.89" },
    "RON": { symbol: "lei", name: "Romanian Leu", decimals: "2", format: "1,234,567.89" },
    "RSD": { symbol: "дин", name: "Serbian Dinar", decimals: "2", format: "1,234,567.89" },
    "RUB": { symbol: "₽", name: "Russian Ruble", decimals: "2", format: "1,234,567.89" },
    "RWF": { symbol: "Fr", name: "Rwandan Franc", decimals: "0", format: "1,234,567" },
    "SAR": { symbol: "﷼", name: "Saudi Riyal", decimals: "2", format: "1,234,567.89" },
    "SBD": { symbol: "$", name: "Solomon Islands Dollar", decimals: "2", format: "1,234,567.89" },
    "SCR": { symbol: "₨", name: "Seychellois Rupee", decimals: "2", format: "1,234,567.89" },
    "SDG": { symbol: "ج.س.", name: "Sudanese Pound", decimals: "2", format: "1,234,567.89" },
    "SEK": { symbol: "kr", name: "Swedish Krona", decimals: "2", format: "1,234,567.89" },
    "SGD": { symbol: "$", name: "Singapore Dollar", decimals: "2", format: "1,234,567.89" },
    "SHP": { symbol: "£", name: "Saint Helena Pound", decimals: "2", format: "1,234,567.89" },
    "SLE": { symbol: "Le", name: "Sierra Leonean Leone", decimals: "2", format: "1,234,567.89" },
    "SLL": { symbol: "Le", name: "Sierra Leonean Leone", decimals: "2", format: "1,234,567.89" },
    "SOS": { symbol: "Sh", name: "Somali Shilling", decimals: "2", format: "1,234,567.89" },
    "SRD": { symbol: "$", name: "Surinamese Dollar", decimals: "2", format: "1,234,567.89" },
    "SSP": { symbol: "£", name: "South Sudanese Pound", decimals: "2", format: "1,234,567.89" },
    "STD": { symbol: "Db", name: "Sao Tomean Dobra", decimals: "2", format: "1,234,567.89" },
    "STN": { symbol: "Db", name: "Sao Tome and Principe Dobra", decimals: "2", format: "1,234,567.89" },
    "SVC": { symbol: "₡", name: "El Salvador Colon", decimals: "2", format: "1,234,567.89" },
    "SYP": { symbol: "£", name: "Syrian Pound", decimals: "2", format: "1,234,567.89" },
    "SZL": { symbol: "L", name: "Swazi Lilangeni", decimals: "2", format: "1,234,567.89" },
    "THB": { symbol: "฿", name: "Thai Baht", decimals: "2", format: "1,234,567.89" },
    "TJS": { symbol: "ЅМ", name: "Tajikistani Somoni", decimals: "2", format: "1,234,567.89" },
    "TMT": { symbol: "m", name: "Turkmenistan Manat", decimals: "2", format: "1,234,567.89" },
    "TND": { symbol: "د.ت", name: "Tunisian Dinar", decimals: "3", format: "1,234,567.89" },
    "TOP": { symbol: "T$", name: "Tongan Paanga", decimals: "2", format: "1,234,567.89" },
    "TRY": { symbol: "₺", name: "Turkish Lira", decimals: "2", format: "1,234,567.89" },
    "TTD": { symbol: "$", name: "Trinidad and Tobago Dollar", decimals: "2", format: "1,234,567.89" },
    "TVD": { symbol: "$", name: "Tuvaluan Dollar", decimals: "2", format: "1,234,567.89" },
    "TWD": { symbol: "NT$", name: "New Taiwan Dollar", decimals: "2", format: "1,234,567.89" },
    "TZS": { symbol: "Sh", name: "Tanzanian Shilling", decimals: "2", format: "1,234,567.89" },
    "UAH": { symbol: "₴", name: "Ukrainian Hryvnia", decimals: "2", format: "1,234,567.89" },
    "UGX": { symbol: "Sh", name: "Ugandan Shilling", decimals: "0", format: "1,234,567" },
    "USD": { symbol: "$", name: "United States Dollar", decimals: "2", format: "1,234,567.89" },
    "UYI": { symbol: "UYI", name: "Uruguay Peso en Unidades Indexadas", decimals: "0", format: "1,234,567" },
    "UYU": { symbol: "$", name: "Uruguayan peso", decimals: "2", format: "1,234,567.89" },
    "UZS": { symbol: "so'm", name: "Uzbekistani Sum", decimals: "2", format: "1,234,567.89" },
    "VED": { symbol: "Bs", name: "Venezuelan Bolivar Digital", decimals: "2", format: "1,234,567.89" },
    "VEF": { symbol: "Bs", name: "Venezuelan Bolivar Fuerte", decimals: "2", format: "1,234,567.89" },
    "VES": { symbol: "Bs", name: "Venezuelan Bolivar Soberano", decimals: "2", format: "1,234,567.89" },
    "VND": { symbol: "₫", name: "Vietnamese Dong", decimals: "0", format: "1,234,567" },
    "VUV": { symbol: "Vt", name: "Vanuatu Vatu", decimals: "0", format: "1,234,567" },
    "WST": { symbol: "T", name: "Samoan Tala", decimals: "2", format: "1,234,567.89" },
    "XAF": { symbol: "Fr", name: "Central African CFA Franc", decimals: "0", format: "1,234,567" },
    "XCD": { symbol: "$", name: "Eastern Caribbean Dollar", decimals: "2", format: "1,234,567.89" },
    "XCG": { symbol: "XCG", name: "Caribbean Guilder", decimals: "2", format: "1,234,567.89" },
    "XDR": { symbol: "XDR", name: "SDR", decimals: "2", format: "1,234,567.89" },
    "XOF": { symbol: "Fr", name: "CFA Franc BCEAO", decimals: "0", format: "1,234,567" },
    "XPF": { symbol: "Fr", name: "CFP Franc", decimals: "0", format: "1,234,567" },
    "YER": { symbol: "﷼", name: "Yemeni Rial", decimals: "2", format: "1,234,567.89" },
    "ZAR": { symbol: "R", name: "South African Rand", decimals: "2", format: "1,234,567.89" },
    "ZMW": { symbol: "ZK", name: "Zambian Kwacha", decimals: "2", format: "1,234,567.89" },
    "ZWG": { symbol: "ZWG", name: "Zimbabwe Gold", decimals: "2", format: "1,234,567.89" },
    "ZWL": { symbol: "$", name: "Zimbabwe Dollar", decimals: "2", format: "1,234,567.89" },
  };

  const currencyCodes = Object.keys(currencyData).map(code => `${code} - ${currencyData[code].name}`);

  const decimalPlacesOptions = ["0", "2", "3", "4", "5", "6"];
  const formatOptions = [
    "1,234,567.89",
    "1.234.567,89",
    "1 234 567,89",
    "1234567.89",
    "1234567,89"
  ];

  const filteredCurrencyCodes = useMemo(() => {
    if (!currencyCodeSearch) return currencyCodes;
    const s = currencyCodeSearch.trim().toLowerCase();
    return currencyCodes.filter((code) => code.toLowerCase().includes(s));
  }, [currencyCodeSearch]);

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
  const [currencyCodePosition, setCurrencyCodePosition] = useState({ top: 0, left: 0, width: 0 });
  const [decimalPlacesPosition, setDecimalPlacesPosition] = useState({ top: 0, left: 0, width: 0 });
  const [formatPosition, setFormatPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (currencyCodeDropdownOpen && currencyCodeRef.current) {
      const rect = currencyCodeRef.current.getBoundingClientRect();
      setCurrencyCodePosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [currencyCodeDropdownOpen]);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyCodeRef.current && !currencyCodeRef.current.contains(event.target as Node) &&
        currencyCodeDropdownRef.current && !currencyCodeDropdownRef.current.contains(event.target as Node)) {
        setCurrencyCodeDropdownOpen(false);
        setCurrencyCodeSearch("");
      }
      if (decimalPlacesRef.current && !decimalPlacesRef.current.contains(event.target as Node) &&
        decimalPlacesDropdownRef.current && !decimalPlacesDropdownRef.current.contains(event.target as Node)) {
        setDecimalPlacesDropdownOpen(false);
        setDecimalPlacesSearch("");
      }
      if (formatRef.current && !formatRef.current.contains(event.target as Node) &&
        formatDropdownRef.current && !formatDropdownRef.current.contains(event.target as Node)) {
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
          <h3 className="text-lg font-semibold text-gray-900">New Currency</h3>
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
            <div className="relative" ref={currencyCodeRef}>
              <button
                type="button"
                onClick={() => setCurrencyCodeDropdownOpen(!currencyCodeDropdownOpen)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={currencyCode ? "text-gray-900" : "text-gray-400"}>
                  {currencyCode || "Select"}
                </span>
                {currencyCodeDropdownOpen ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {currencyCodeDropdownOpen && createPortal(
                <div
                  ref={currencyCodeDropdownRef}
                  className="fixed overflow-hidden rounded-xl border-2 border-blue-300 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                  style={{
                    top: `${currencyCodePosition.top}px`,
                    left: `${currencyCodePosition.left}px`,
                    width: `${currencyCodePosition.width}px`,
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
                      value={currencyCodeSearch}
                      onChange={(e) => setCurrencyCodeSearch(e.target.value)}
                    />
                  </div>
                  <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                    {filteredCurrencyCodes.map((code) => {
                      const isSelected = code === currencyCode;
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                            ${isSelected ? "bg-blue-500 text-white" : "text-gray-900 hover:bg-gray-50"}
                          `}
                          onClick={() => {
                            setCurrencyCode(code);
                            const parts = code.split(" - ");
                            const codeKey = parts[0];
                            const currencyInfo = currencyData[codeKey];

                            if (currencyInfo) {
                              setCurrencySymbol(currencyInfo.symbol);
                              setCurrencyName(currencyInfo.name);
                              setDecimalPlaces(currencyInfo.decimals);
                              setFormat(currencyInfo.format);
                            } else {
                              // Fallback if currency data not found
                              setCurrencySymbol(parts[0]);
                              setCurrencyName(parts[1] || "");
                            }

                            setCurrencyCodeDropdownOpen(false);
                            setCurrencyCodeSearch("");
                          }}
                        >
                          {code}
                        </button>
                      );
                    })}
                    {filteredCurrencyCodes.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
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
              placeholder="Enter currency symbol"
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
              placeholder="Enter currency name"
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

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

