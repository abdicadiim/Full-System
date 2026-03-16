import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
    Search,
    Plus,
    ChevronDown,
    ChevronUp,
    X,
    CreditCard,
    AlertCircle,
    PlusCircle,
    ChevronRight,
    HelpCircle,
    Check,
    Pencil,
    Info,
    MoreVertical,
    Trash2,
    CheckCircle,
    GripVertical,
    Image as ImageIcon,
    FileText,
} from "lucide-react";
import { useOrganizationBranding } from "../../../../hooks/useOrganizationBranding";
import { Customer, Salesperson, getCustomers, getSalespersonsFromAPI, getPlansFromAPI, getBaseCurrency, getItemsFromAPI, getTaxesFromAPI, Tax, getReportingTagsFromAPI, ReportingTag } from "../../salesModel";
import { customersAPI } from "../../../../services/api";
import { toast } from "react-toastify";
import { Country, State } from "country-state-city";

type ProductOption = {
    id: string;
    name: string;
    code?: string;
    status?: string;
    active?: boolean;
};

type PlanAddonOption = {
    id: string;
    name: string;
    code: string;
    type: "plan" | "addon";
    productId?: string;
    productName: string;
    rate: number;
    status?: string;
    active?: boolean;
    taxName?: string;
    taxId?: string;
    taxRate?: number;
};

type CouponOption = {
    id: string;
    couponName: string;
    couponCode: string;
    discountType: string;
    discountValue: number;
    status?: string;
    active?: boolean;
    product?: string;
    productId?: string;
};

type AddonLine = {
    id: number;
    addonId?: string;
    addonName: string;
    description: string;
    quantity: number;
    rate: number;
    baseRate?: number;
    tax: string;
    taxRate: number;
    amount: number;
};


const PHONE_COUNTRY_OPTIONS = [
    { name: "Afghanistan", phoneCode: "+93" },
    { name: "Aland Islands", phoneCode: "+358" },
    { name: "Albania", phoneCode: "+355" },
    { name: "Algeria", phoneCode: "+213" },
    { name: "American Samoa", phoneCode: "+1" },
    { name: "Andorra", phoneCode: "+376" },
    { name: "Angola", phoneCode: "+244" },
    { name: "Anguilla", phoneCode: "+1" },
    { name: "Antarctica", phoneCode: "+672" },
    { name: "Antigua and Barbuda", phoneCode: "+1" },
    { name: "Argentina", phoneCode: "+54" },
    { name: "Armenia", phoneCode: "+374" },
    { name: "Aruba", phoneCode: "+297" },
    { name: "Ashmore and Cartier Islands", phoneCode: "+61" },
    { name: "Australia", phoneCode: "+61" },
    { name: "Austria", phoneCode: "+43" },
    { name: "Azerbaijan", phoneCode: "+994" },
    { name: "Bahamas", phoneCode: "+1" },
    { name: "Bahrain", phoneCode: "+973" },
    { name: "Bangladesh", phoneCode: "+880" },
    { name: "Barbados", phoneCode: "+1" },
    { name: "Belarus", phoneCode: "+375" },
    { name: "Belgium", phoneCode: "+32" },
    { name: "Belize", phoneCode: "+501" },
    { name: "Benin", phoneCode: "+229" },
    { name: "Bermuda", phoneCode: "+1" },
    { name: "Bhutan", phoneCode: "+975" },
    { name: "Bolivia", phoneCode: "+591" },
    { name: "Bonaire, Sint Eustatius and Saba", phoneCode: "+599" },
    { name: "Bosnia", phoneCode: "+387" },
    { name: "Bosnia and Herzegovina", phoneCode: "+387" },
    { name: "Botswana", phoneCode: "+267" },
    { name: "Bouvet Island", phoneCode: "+47" },
    { name: "Brazil", phoneCode: "+55" },
    { name: "British Indian Ocean Territory", phoneCode: "+246" },
    { name: "British Virgin Islands", phoneCode: "+1" },
    { name: "Brunei", phoneCode: "+673" },
    { name: "Bulgaria", phoneCode: "+359" },
    { name: "Burkina Faso", phoneCode: "+226" },
    { name: "Burundi", phoneCode: "+257" },
    { name: "Cambodia", phoneCode: "+855" },
    { name: "Cameroon", phoneCode: "+237" },
    { name: "Canada", phoneCode: "+1" },
    { name: "Cape Verde", phoneCode: "+238" },
    { name: "Cayman Islands", phoneCode: "+1" },
    { name: "Central African Republic", phoneCode: "+236" },
    { name: "Chad", phoneCode: "+235" },
    { name: "Chile", phoneCode: "+56" },
    { name: "China", phoneCode: "+86" },
    { name: "Christmas Island", phoneCode: "+61" },
    { name: "Clipperton Island", phoneCode: "+33" },
    { name: "Cocos Islands", phoneCode: "+61" },
    { name: "Colombia", phoneCode: "+57" },
    { name: "Comoros", phoneCode: "+269" },
    { name: "Congo", phoneCode: "+242" },
    { name: "Cook Islands", phoneCode: "+682" },
    { name: "Coral Sea Islands", phoneCode: "+61" },
    { name: "Costa Rica", phoneCode: "+506" },
    { name: "Croatia", phoneCode: "+385" },
    { name: "Cuba", phoneCode: "+53" },
    { name: "Curacao", phoneCode: "+599" },
    { name: "Cyprus", phoneCode: "+357" },
    { name: "Czech Republic", phoneCode: "+420" },
    { name: "DR Congo", phoneCode: "+243" },
    { name: "Denmark", phoneCode: "+45" },
    { name: "Djibouti", phoneCode: "+253" },
    { name: "Dominica", phoneCode: "+1" },
    { name: "Dominican Republic", phoneCode: "+1" },
    { name: "Ecuador", phoneCode: "+593" },
    { name: "Egypt", phoneCode: "+20" },
    { name: "El Salvador", phoneCode: "+503" },
    { name: "Equatorial Guinea", phoneCode: "+240" },
    { name: "Eritrea", phoneCode: "+291" },
    { name: "Estonia", phoneCode: "+372" },
    { name: "Eswatini", phoneCode: "+268" },
    { name: "Ethiopia", phoneCode: "+251" },
    { name: "Falkland Islands", phoneCode: "+500" },
    { name: "Faroe Islands", phoneCode: "+298" },
    { name: "Fiji", phoneCode: "+679" },
    { name: "Finland", phoneCode: "+358" },
    { name: "France", phoneCode: "+33" },
    { name: "French Guiana", phoneCode: "+594" },
    { name: "French Polynesia", phoneCode: "+689" },
    { name: "French Southern Territories", phoneCode: "+262" },
    { name: "Gabon", phoneCode: "+241" },
    { name: "Gambia", phoneCode: "+220" },
    { name: "Georgia", phoneCode: "+995" },
    { name: "Germany", phoneCode: "+49" },
    { name: "Ghana", phoneCode: "+233" },
    { name: "Gibraltar", phoneCode: "+350" },
    { name: "Greece", phoneCode: "+30" },
    { name: "Greenland", phoneCode: "+299" },
    { name: "Grenada", phoneCode: "+1" },
    { name: "Guadeloupe", phoneCode: "+590" },
    { name: "Guam", phoneCode: "+1" },
    { name: "Guatemala", phoneCode: "+502" },
    { name: "Guernsey", phoneCode: "+44" },
    { name: "Guinea", phoneCode: "+224" },
    { name: "Guinea-Bissau", phoneCode: "+245" },
    { name: "Guyana", phoneCode: "+592" },
    { name: "Haiti", phoneCode: "+509" },
    { name: "Heard Island and McDonald Islands", phoneCode: "+672" },
    { name: "High Seas", phoneCode: "+503" },
    { name: "Honduras", phoneCode: "+504" },
    { name: "Hong Kong", phoneCode: "+852" },
    { name: "Hungary", phoneCode: "+36" },
    { name: "Iceland", phoneCode: "+354" },
    { name: "India", phoneCode: "+91" },
    { name: "Indonesia", phoneCode: "+62" },
    { name: "Iran", phoneCode: "+98" },
    { name: "Iraq", phoneCode: "+964" },
    { name: "Ireland", phoneCode: "+353" },
    { name: "Isle of Man", phoneCode: "+44" },
    { name: "Israel", phoneCode: "+972" },
    { name: "Italy", phoneCode: "+39" },
    { name: "Côte d'Ivoire", phoneCode: "+225" },
    { name: "Jamaica", phoneCode: "+1" },
    { name: "Japan", phoneCode: "+81" },
    { name: "Jersey", phoneCode: "+44" },
    { name: "Jordan", phoneCode: "+962" },
    { name: "Kazakhstan", phoneCode: "+7" },
    { name: "Kenya", phoneCode: "+254" },
    { name: "Kiribati", phoneCode: "+686" },
    { name: "Kosova Republic", phoneCode: "+383" },
    { name: "Kosovo", phoneCode: "+383" },
    { name: "Kuwait", phoneCode: "+965" },
    { name: "Kyrgyzstan", phoneCode: "+996" },
    { name: "Laos", phoneCode: "+856" },
    { name: "Latvia", phoneCode: "+371" },
    { name: "Lebanon", phoneCode: "+961" },
    { name: "Lesotho", phoneCode: "+266" },
    { name: "Liberia", phoneCode: "+231" },
    { name: "Libya", phoneCode: "+218" },
    { name: "Liechtenstein", phoneCode: "+423" },
    { name: "Lithuania", phoneCode: "+370" },
    { name: "Luxembourg", phoneCode: "+352" },
    { name: "Macau", phoneCode: "+853" },
    { name: "Madagascar", phoneCode: "+261" },
    { name: "Malawi", phoneCode: "+265" },
    { name: "Malaysia", phoneCode: "+60" },
    { name: "Maldives", phoneCode: "+960" },
    { name: "Mali", phoneCode: "+223" },
    { name: "Malta", phoneCode: "+356" },
    { name: "Marshall Islands", phoneCode: "+692" },
    { name: "Martinique", phoneCode: "+596" },
    { name: "Mauritania", phoneCode: "+222" },
    { name: "Mauritius", phoneCode: "+230" },
    { name: "Mayotte", phoneCode: "+262" },
    { name: "Mexico", phoneCode: "+52" },
    { name: "Micronesia", phoneCode: "+691" },
    { name: "Moldova", phoneCode: "+373" },
    { name: "Monaco", phoneCode: "+377" },
    { name: "Mongolia", phoneCode: "+976" },
    { name: "Montenegro", phoneCode: "+382" },
    { name: "Montserrat", phoneCode: "+1" },
    { name: "Morocco", phoneCode: "+212" },
    { name: "Mozambique", phoneCode: "+258" },
    { name: "Myanmar", phoneCode: "+95" },
    { name: "Namibia", phoneCode: "+264" },
    { name: "Nauru", phoneCode: "+674" },
    { name: "Nepal", phoneCode: "+977" },
    { name: "Netherlands", phoneCode: "+31" },
    { name: "Netherlands Antilles", phoneCode: "+599" },
    { name: "New Caledonia", phoneCode: "+687" },
    { name: "New Zealand", phoneCode: "+64" },
    { name: "Nicaragua", phoneCode: "+505" },
    { name: "Niger", phoneCode: "+227" },
    { name: "Nigeria", phoneCode: "+234" },
    { name: "Niue", phoneCode: "+683" },
    { name: "Norfolk Island", phoneCode: "+672" },
    { name: "North Korea", phoneCode: "+850" },
    { name: "North Macedonia", phoneCode: "+389" },
    { name: "Northern Mariana Islands", phoneCode: "+1" },
    { name: "Norway", phoneCode: "+47" },
    { name: "Oman", phoneCode: "+968" },
    { name: "Pakistan", phoneCode: "+92" },
    { name: "Palau", phoneCode: "+680" },
    { name: "Palestine", phoneCode: "+970" },
    { name: "Panama", phoneCode: "+507" },
    { name: "Papua New Guinea", phoneCode: "+675" },
    { name: "Paraguay", phoneCode: "+595" },
    { name: "Peru", phoneCode: "+51" },
    { name: "Philippines", phoneCode: "+63" },
    { name: "Pitcairn", phoneCode: "+64" },
    { name: "Poland", phoneCode: "+48" },
    { name: "Portugal", phoneCode: "+351" },
    { name: "Puerto Rico", phoneCode: "+1" },
    { name: "Qatar", phoneCode: "+974" },
    { name: "Reunion", phoneCode: "+262" },
    { name: "Romania", phoneCode: "+40" },
    { name: "Russia", phoneCode: "+7" },
    { name: "Rwanda", phoneCode: "+250" },
    { name: "Saint Barthelemy", phoneCode: "+590" },
    { name: "Saint Helena", phoneCode: "+290" },
    { name: "Saint Kitts and Nevis", phoneCode: "+1" },
    { name: "Saint Lucia", phoneCode: "+1" },
    { name: "Saint Martin", phoneCode: "+590" },
    { name: "Saint Pierre and Miquelon", phoneCode: "+508" },
    { name: "Saint Vincent and the Grenadines", phoneCode: "+1" },
    { name: "Samoa", phoneCode: "+685" },
    { name: "San Marino", phoneCode: "+378" },
    { name: "Sao Tome and Principe", phoneCode: "+239" },
    { name: "Saudi Arabia", phoneCode: "+966" },
    { name: "Senegal", phoneCode: "+221" },
    { name: "Serbia", phoneCode: "+381" },
    { name: "Serbia and Montenegro", phoneCode: "+381" },
    { name: "Seychelles", phoneCode: "+248" },
    { name: "Sierra Leone", phoneCode: "+232" },
    { name: "Singapore", phoneCode: "+65" },
    { name: "Sint Maarten", phoneCode: "+1" },
    { name: "Slovakia", phoneCode: "+421" },
    { name: "Slovenia", phoneCode: "+386" },
    { name: "Solomon Islands", phoneCode: "+677" },
    { name: "Somalia", phoneCode: "+252" },
    { name: "Somaliland", phoneCode: "+252" },
    { name: "South Africa", phoneCode: "+27" },
    { name: "South Georgia and the South Sandwich Islands", phoneCode: "+500" },
    { name: "South Korea", phoneCode: "+82" },
    { name: "South Sudan", phoneCode: "+211" },
    { name: "Spain", phoneCode: "+34" },
    { name: "Sri Lanka", phoneCode: "+94" },
    { name: "Sudan", phoneCode: "+249" },
    { name: "Suriname", phoneCode: "+597" },
    { name: "Svalbard and Jan Mayen", phoneCode: "+47" },
    { name: "Swaziland", phoneCode: "+268" },
    { name: "Sweden", phoneCode: "+46" },
    { name: "Switzerland", phoneCode: "+41" },
    { name: "Syria", phoneCode: "+963" },
    { name: "Taiwan", phoneCode: "+886" },
    { name: "Tajikistan", phoneCode: "+992" },
    { name: "Tanzania", phoneCode: "+255" },
    { name: "Thailand", phoneCode: "+66" },
    { name: "Timor Leste", phoneCode: "+670" },
    { name: "Togo", phoneCode: "+228" },
    { name: "Tokelau", phoneCode: "+690" },
    { name: "Tonga", phoneCode: "+676" },
    { name: "Trinidad and Tobago", phoneCode: "+1" },
    { name: "Tunisia", phoneCode: "+216" },
    { name: "Turkey", phoneCode: "+90" },
    { name: "Turkmenistan", phoneCode: "+993" },
    { name: "Turks and Caicos Islands", phoneCode: "+1" },
    { name: "Tuvalu", phoneCode: "+688" },
    { name: "U.A.E", phoneCode: "+971" },
    { name: "U.S.A", phoneCode: "+1" },
    { name: "Uganda", phoneCode: "+256" },
    { name: "Ukraine", phoneCode: "+380" },
    { name: "United Arab Emirates", phoneCode: "+971" },
    { name: "United Kingdom", phoneCode: "+44" },
    { name: "United States Minor Outlying Islands", phoneCode: "+1" },
    { name: "Uruguay", phoneCode: "+598" },
    { name: "Uzbekistan", phoneCode: "+998" },
    { name: "Vanuatu", phoneCode: "+678" },
    { name: "Vatican City", phoneCode: "+379" },
    { name: "Venezuela", phoneCode: "+58" },
    { name: "Vietnam", phoneCode: "+84" },
    { name: "Virgin Islands, British", phoneCode: "+1" },
    { name: "Virgin Islands, U.S.", phoneCode: "+1" },
    { name: "Wallis and Futuna", phoneCode: "+681" },
    { name: "Western Sahara", phoneCode: "+212" },
    { name: "Yemen", phoneCode: "+967" },
    { name: "Zambia", phoneCode: "+260" },
    { name: "Zimbabwe", phoneCode: "+263" },
];

const ACCOUNT_GROUPS = [
    {
        title: "Other Current Asset",
        items: [
            "Advance Tax",
            "Employee Advance",
            "Goods In Transit",
            "Prepaid Expenses",
            "Retention Receivable",
        ],
    },
    {
        title: "Fixed Asset",
        items: [
            "Furniture and Equipment",
        ],
    },
    {
        title: "Other Current Liability",
        items: [
            "Employee Reimbursements",
            "Opening Balance Adjustments",
            "Retention Payable",
            "Unearned Revenue",
        ],
    },
    {
        title: "Equity",
        items: [
            "Drawings",
            "Opening Balance Offset",
            "Owner's Equity",
        ],
    },
    {
        title: "Income",
        items: [
            "Discount",
            "General Income",
            "Interest Income",
            "Late Fee Income",
            "Other Charges",
            "Sales",
            "Shipping Charge",
        ],
    },
    {
        title: "Expense",
        items: [
            "Advertising And Marketing",
            "Automobile Expense",
            "Bad Debt",
            "Bank Fees and Charges",
            "Consultant Expense",
            "Credit Card Charges",
            "Depreciation Expense",
            "IT and Internet Expenses",
            "Janitorial Expense",
            "Lodging",
            "Meals and Entertainment",
            "Office Supplies",
            "Other Expenses",
            "Postage",
            "Printing and Stationery",
            "Purchase Discounts",
            "Rent Expense",
            "Repairs and Maintenance",
            "Salaries and Employee Wages",
            "sdff",
            "Telephone Expense",
            "Travel Expense",
            "Uncategorized",
        ],
    },
    {
        title: "Cost Of Goods Sold",
        items: [
            "Cost Of Goods Sold",
            "Cost of Goods Sold",
        ],
    },
];

const ACCOUNT_OPTIONS = ACCOUNT_GROUPS.flatMap((group) => [group.title, ...group.items]);

const NewSubscriptionPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { subscriptionId } = useParams();
    const { accentColor } = useOrganizationBranding();
    const editDraft = (location.state as any)?.draft || null;
     const isEditMode = Boolean(editDraft || subscriptionId);

    // Data State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [planAddons, setPlanAddons] = useState<PlanAddonOption[]>([]);
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isLoadingSalespersons, setIsLoadingSalespersons] = useState(false);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [reportingTags, setReportingTags] = useState<ReportingTag[]>([]);

    // UI State
    const [customerSearch, setCustomerSearch] = useState("");
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    const [productSearch, setProductSearch] = useState("");
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const productDropdownRef = useRef<HTMLDivElement>(null);
    const [planAddonSearch, setPlanAddonSearch] = useState("");
    const [isPlanAddonDropdownOpen, setIsPlanAddonDropdownOpen] = useState(false);
    const planAddonDropdownRef = useRef<HTMLDivElement>(null);
    const [salespersonSearch, setSalespersonSearch] = useState("");
    const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
    const salespersonDropdownRef = useRef<HTMLDivElement>(null);
    const [isReportingTagDropdownOpen, setIsReportingTagDropdownOpen] = useState(false);
    const reportingTagDropdownRef = useRef<HTMLDivElement>(null);
    const [reportingTagSearch, setReportingTagSearch] = useState("");
    const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(false);
    const couponDropdownRef = useRef<HTMLTableCellElement | null>(null);
    const [couponSearch, setCouponSearch] = useState("");
    const [coupons, setCoupons] = useState<CouponOption[]>([]);
    const defaultAddonLines: AddonLine[] = [
        { id: 1, addonName: "", description: "", quantity: 1, rate: 0, baseRate: 0, tax: "Select a Tax", taxRate: 0, amount: 0 }
    ];
    const [addonLines, setAddonLines] = useState<AddonLine[]>(defaultAddonLines);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const bulkActionsRef = useRef<HTMLDivElement>(null);
    const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<number, boolean>>({});
    const [itemSearches, setItemSearches] = useState<Record<number, string>>({});
    const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<number, boolean>>({});
    const [taxSearches, setTaxSearches] = useState<Record<number, string>>({});
    const [openAccountDropdowns, setOpenAccountDropdowns] = useState<Record<number, boolean>>({});
    const [accountSearches, setAccountSearches] = useState<Record<number, string>>({});
    const [openItemTagDropdowns, setOpenItemTagDropdowns] = useState<Record<number, boolean>>({});
    const [itemTagSearches, setItemTagSearches] = useState<Record<number, string>>({});
    const [openItemMenus, setOpenItemMenus] = useState<Record<number, boolean>>({});
    const itemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const accountDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const itemTagDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const itemMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [showOtherPreferences, setShowOtherPreferences] = useState(false);
    const [isBulkItemsModalOpen, setIsBulkItemsModalOpen] = useState(false);
    const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);
    const [bulkItemSearch, setBulkItemSearch] = useState("");
    const [bulkItemQuantities, setBulkItemQuantities] = useState<Record<string, number>>({});
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [billingAddress, setBillingAddress] = useState<any | null>(null);
    const [shippingAddress, setShippingAddress] = useState<any | null>(null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [addressModalType, setAddressModalType] = useState<"billing" | "shipping">("billing");
    const [isAddressSaving, setIsAddressSaving] = useState(false);
    const [isPhoneCodeDropdownOpen, setIsPhoneCodeDropdownOpen] = useState(false);
    const [phoneCodeSearch, setPhoneCodeSearch] = useState("");
    const phoneCodeDropdownRef = useRef<HTMLDivElement | null>(null);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const [stateSearch, setStateSearch] = useState("");
    const [isDigitalServiceOpen, setIsDigitalServiceOpen] = useState(false);
    const [digitalServiceEnabled, setDigitalServiceEnabled] = useState(false);
    const digitalServiceRef = useRef<HTMLDivElement | null>(null);
    const draftHydratedRef = useRef(false);
    const countryDropdownRef = useRef<HTMLDivElement | null>(null);
    const stateDropdownRef = useRef<HTMLDivElement | null>(null);
    const [addressFormData, setAddressFormData] = useState({
        attention: "",
        country: "",
        street1: "",
        street2: "",
        city: "",
        state: "",
        zipCode: "",
        phoneCountryCode: "",
        phone: "",
        fax: "",
    });

    // Form State
    const initialFormData = {
        id: "",
        customerId: "",
        customerName: "",
        productId: "",
        productName: "",
        currency: "AMD",
        priceListId: "",
        priceListName: "Select Price List",
        contactPersons: [] as any[],
        billingAddress: null as any,
        shippingAddress: null as any,
        location: "Head Office",
        contentType: "product", // product or items
        taxPreference: "Tax Exclusive",
        tag: "GGGGG",
        planName: "Select a Plan",
        planDescription: "",
        quantity: 1,
        price: 0.00,
        basePrice: 0.00,
        tax: "Select a Tax",
        subscriptionNumber: "SUB-00002",
        profileName: "",
        billEveryCount: 1,
        billEveryUnit: "Week(s)",
        startDate: new Date().toISOString().split('T')[0],
        expiresAfter: "",
        neverExpires: false,
        referenceNumber: "",
        salesperson: "",
        customZxc: "",
        meteredBilling: true,
        paymentMode: "offline",
        paymentTerms: "Due on Receipt",
        partialPayments: false,
        prorateCharges: true,
        generateInvoices: true,
        invoiceTemplate: "Standard Template",
        roundOffPreference: "No Rounding",
        customerNotes: "Thanks for your business.",
        coupon: "",
        couponCode: "",
        couponValue: "0.00",
        createdOn: "",
        activatedOn: "",
        lastBilledOn: "",
        nextBillingOn: "",
        status: "",
        items: [
            { id: 1, itemDetails: "", quantity: 1, rate: 0, tax: "Select a Tax", taxRate: 0, amount: 0, description: "", account: "", reportingTag: "", imageUrl: "", sku: "", showAdditional: true, isHeader: false, headerText: "" }
        ],
        reportingTags: [] as any[]
        ,
        applyChanges: "immediately",
        applyChangesDate: "",
        backdatedGenerateInvoice: true
    };

    const [formData, setFormData] = useState(initialFormData);

    const readRows = (key: string) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const mapProductsRows = (rows: any[]): ProductOption[] =>
        rows
            .map((row: any, idx: number) => {
                const statusValue =
                    row?.status ??
                    row?.Status ??
                    row?.productStatus ??
                    row?.state ??
                    row?.statusLabel ??
                    row?.statusText;
                const rawActive =
                    row?.active ??
                    row?.isActive ??
                    row?.is_active ??
                    row?.enabled;
                const rawInactive =
                    row?.inactive ??
                    row?.isInactive ??
                    row?.is_inactive ??
                    row?.disabled;
                const activeValue =
                    typeof rawInactive !== "undefined" ? !rawInactive : rawActive;
                return {
                    id: String(row?.id || row?._id || `prod-${idx}`),
                    name: String(row?.name || row?.productName || row?.product || "").trim(),
                    code: String(row?.code || row?.sku || row?.productCode || "").trim(),
                    status: String(statusValue || ""),
                    active: typeof activeValue === "boolean" ? activeValue : undefined,
                };
            })
            .filter((row: ProductOption) => row.name);

    const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
    const resolveActiveFlag = (statusValue: any, activeValue: any) => {
        const normalizedStatus = normalizeText(statusValue);
        if (normalizedStatus) {
            if (["0", "false", "no", "off"].includes(normalizedStatus)) return false;
            if (["1", "true", "yes", "on"].includes(normalizedStatus)) return true;
            if (normalizedStatus.includes("inactive") || normalizedStatus.includes("disabled") || normalizedStatus.includes("archived")) return false;
            if (normalizedStatus.includes("active")) return true;
            if (normalizedStatus === "draft" || normalizedStatus === "paused") return false;
        }
        if (typeof activeValue === "boolean") return activeValue;
        if (typeof activeValue === "number") return activeValue > 0;
        if (typeof activeValue === "string") {
            const normalizedActive = normalizeText(activeValue);
            if (["true", "yes", "1", "active", "enabled"].includes(normalizedActive)) return true;
            if (["false", "no", "0", "inactive", "disabled"].includes(normalizedActive)) return false;
        }
        return true;
    };
    const countryOptions = useMemo(() => Country.getAllCountries(), []);
    const selectedCountryIso = useMemo(() => {
        const raw = String(addressFormData.country || "").trim();
        if (!raw) return "";
        const byName = countryOptions.find(
            (country: any) => String(country.name || "").toLowerCase() === raw.toLowerCase()
        );
        if (byName?.isoCode) return byName.isoCode;
        const byCode = countryOptions.find(
            (country: any) => String(country.isoCode || "").toLowerCase() === raw.toLowerCase()
        );
        return byCode?.isoCode || "";
    }, [addressFormData.country, countryOptions]);

    const stateOptions = useMemo(() => {
        if (!selectedCountryIso) return [];
        return State.getStatesOfCountry(selectedCountryIso) || [];
    }, [selectedCountryIso]);

    const filteredCountryOptions = useMemo(() => {
        const term = String(countrySearch || "").trim().toLowerCase();
        if (!term) return countryOptions;
        return countryOptions.filter((country: any) =>
            String(country.name || "").toLowerCase().includes(term)
        );
    }, [countrySearch, countryOptions]);

    const filteredStateOptions = useMemo(() => {
        const term = String(stateSearch || "").trim().toLowerCase();
        if (!term) return stateOptions;
        return stateOptions.filter((state: any) =>
            String(state.name || "").toLowerCase().includes(term)
        );
    }, [stateSearch, stateOptions]);

    const phoneCountryOptions = useMemo(
        () => PHONE_COUNTRY_OPTIONS.map((entry, idx) => ({ ...entry, isoCode: `${entry.name}-${idx}` })),
        []
    );

    const filteredPhoneCountryOptions = useMemo(() => {
        const term = String(phoneCodeSearch || "").trim().toLowerCase();
        if (!term) return phoneCountryOptions;
        return phoneCountryOptions.filter(
            (entry: any) =>
                String(entry.name || "").toLowerCase().includes(term) ||
                String(entry.phoneCode || "").toLowerCase().includes(term)
        );
    }, [phoneCodeSearch, phoneCountryOptions]);

    const activeCoupons = useMemo(() => {
        const selectedProductId = String(formData.productId || "").trim().toLowerCase();
        const selectedProductLabel = String(formData.productName || "").trim().toLowerCase();
        const selectedCouponName = normalizeText(formData.coupon);
        const selectedCouponCode = normalizeText(formData.couponCode);
        return coupons.filter((coupon: CouponOption) => {
            const isActive = resolveActiveFlag(coupon.status, coupon.active);
            if (!isActive) {
                if (!isEditMode) return false;
                const nameMatch = selectedCouponName && normalizeText(coupon.couponName) === selectedCouponName;
                const codeMatch = selectedCouponCode && normalizeText(coupon.couponCode) === selectedCouponCode;
                if (!nameMatch && !codeMatch) return false;
            }
            const couponProduct = normalizeText(coupon.product);
            const couponProductId = normalizeText(coupon.productId);
            if (!couponProduct && !couponProductId) return false;
            if (selectedProductId && couponProductId === selectedProductId) return true;
            if (!selectedProductLabel) return false;
            return (
                couponProduct === selectedProductLabel ||
                couponProduct.includes(selectedProductLabel) ||
                selectedProductLabel.includes(couponProduct)
            );
        });
    }, [
        coupons,
        formData.productId,
        formData.productName,
        formData.coupon,
        formData.couponCode,
        normalizeText,
        resolveActiveFlag,
        isEditMode,
    ]);

    const filteredCoupons = useMemo(() => {
        const term = normalizeText(couponSearch);
        if (!term) return activeCoupons;
        return activeCoupons.filter(
            (coupon: CouponOption) =>
                normalizeText(coupon.couponName).includes(term) ||
                normalizeText(coupon.couponCode).includes(term)
        );
    }, [activeCoupons, couponSearch]);

    const extractProductLink = (row: any) => {
        const productSource = row?.product;
        const sourceName = typeof productSource === "string" ? productSource : (productSource?.name || "");
        const sourceId = typeof productSource === "object" ? (productSource?._id || productSource?.id || "") : "";
        return {
            productId: String(row?.productId || sourceId || "").trim(),
            productName: String(row?.productName || sourceName || "").trim(),
        };
    };

    const isEmptyAddress = (addr: any) => {
        if (!addr || typeof addr !== "object") return true;
        const keys = [
            "attention",
            "country",
            "street1",
            "street2",
            "city",
            "state",
            "zipCode",
            "phone",
            "fax",
            "phoneNumber",
            "mobile",
            "mobilePhone",
        ];
        return !keys.some((key) => String(addr?.[key] || "").trim());
    };

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingCustomers(true);
            setIsLoadingSalespersons(true);
            setIsLoadingPlans(true);
            setIsLoadingItems(true);
            try {
                const [customersData, salespersonsData, plansData, baseCurrency, itemsData, taxesData, reportingTagsData] = await Promise.all([
                    getCustomers({ status: 'active' }),
                    getSalespersonsFromAPI(),
                    getPlansFromAPI(),
                    getBaseCurrency(),
                    getItemsFromAPI(),
                    getTaxesFromAPI(),
                    getReportingTagsFromAPI()
                ]);
                setCustomers(customersData);
                setSalespersons(salespersonsData);
                setAvailableItems(itemsData);
                setTaxes(taxesData);
                setReportingTags(reportingTagsData);

                if (!formData.customerId) {
                    setFormData(prev => ({ ...prev, currency: baseCurrency }));
                }

                // Map Plans from API
                const mappedPlans: PlanAddonOption[] = plansData
                    .map((row: any, idx: number) => {
                        const statusValue =
                            row?.status ??
                            row?.Status ??
                            row?.planStatus ??
                            row?.state ??
                            row?.statusLabel ??
                            row?.statusText;
                        const rawActive =
                            row?.active ??
                            row?.isActive ??
                            row?.is_active ??
                            row?.enabled;
                        const rawInactive =
                            row?.inactive ??
                            row?.isInactive ??
                            row?.is_inactive ??
                            row?.disabled;
                        const activeValue =
                            typeof rawInactive !== "undefined" ? !rawInactive : rawActive;
                        return {
                            id: `plan:${row.id || row._id || idx}`,
                            name: String(row.planName || row.name || "").trim(),
                            code: String(row.planCode || row.code || "").trim(),
                            type: "plan" as const,
                            ...extractProductLink(row),
                            rate: Number(row.price ?? row.rate ?? 0) || 0,
                            taxName: String(
                                row.taxName ||
                                row.tax?.name ||
                                row.tax ||
                                row.taxLabel ||
                                ""
                            ).trim(),
                            taxId: String(
                                row.taxId ||
                                row.tax_id ||
                                row.tax?._id ||
                                row.tax?.id ||
                                ""
                            ).trim(),
                            taxRate: Number(
                                row.taxRate ??
                                row.tax_rate ??
                                row.taxPercent ??
                                row.tax?.rate ??
                                0
                            ) || 0,
                            status: String(statusValue || ""),
                            active: typeof activeValue === "boolean" ? activeValue : undefined,
                        };
                    })
                    .filter((p) => p.name);

                const productsRows = readRows("inv_products_v1");
                const mappedProducts: ProductOption[] = mapProductsRows(productsRows);

                const addonsRows = readRows("inv_addons_v1");
                const mappedAddons: PlanAddonOption[] = addonsRows
                    .map((row: any, idx: number) => {
                        const statusValue =
                            row?.status ??
                            row?.Status ??
                            row?.addonStatus ??
                            row?.state ??
                            row?.statusLabel ??
                            row?.statusText;
                        const rawActive =
                            row?.active ??
                            row?.isActive ??
                            row?.is_active ??
                            row?.enabled;
                        const rawInactive =
                            row?.inactive ??
                            row?.isInactive ??
                            row?.is_inactive ??
                            row?.disabled;
                        const activeValue =
                            typeof rawInactive !== "undefined" ? !rawInactive : rawActive;
                        return {
                            id: `addon:${String(row?.id || row?._id || idx)}`,
                            name: String(row?.addonName || row?.name || "").trim(),
                            code: String(row?.addonCode || row?.code || "").trim(),
                            type: "addon" as const,
                            ...extractProductLink(row),
                            rate: Number(row?.price ?? row?.rate ?? row?.recurringPrice ?? 0) || 0,
                            taxName: String(
                                row?.taxName ||
                                row?.tax?.name ||
                                row?.tax ||
                                row?.taxLabel ||
                                ""
                            ).trim(),
                            taxId: String(
                                row?.taxId ||
                                row?.tax_id ||
                                row?.tax?._id ||
                                row?.tax?.id ||
                                ""
                            ).trim(),
                            taxRate: Number(
                                row?.taxRate ??
                                row?.tax_rate ??
                                row?.taxPercent ??
                                row?.tax?.rate ??
                                0
                            ) || 0,
                            status: String(statusValue || ""),
                            active: typeof activeValue === "boolean" ? activeValue : undefined,
                        };
                    })
                    .filter((row: PlanAddonOption) => row.name);

                setProducts(mappedProducts);
                setPlanAddons([...mappedPlans, ...mappedAddons]);

                const rawPriceLists = readRows("inv_price_lists_v1");
                const mappedPriceLists = rawPriceLists
                    .map((row: any, idx: number) => ({
                        id: String(row?.id || row?._id || `pl-${idx}`),
                        name: String(row?.name || row?.priceListName || "").trim(),
                        status: String(row?.status || "Active"),
                        currency: String(row?.currency || baseCurrency || ""),
                        priceListType: String(row?.priceListType || row?.type || ""),
                        markupType: String(row?.markupType || "Markup"),
                        markup: String(row?.markup || row?.markupPercentage || "0"),
                        roundOffTo: String(row?.roundOffTo || "Never mind"),
                        productRates: Array.isArray(row?.productRates || row?.product_rates)
                            ? (row?.productRates || row?.product_rates)
                            : [],
                    }))
                    .filter((row: any) => row.name)
                    .filter((row: any) => String(row.status || "").toLowerCase() !== "inactive");
                setPriceLists(mappedPriceLists);

            } catch (error) {
                console.error("Failed to load data:", error);
                toast.error("Failed to load some data. Please try again.");
            } finally {
                setIsLoadingCustomers(false);
                setIsLoadingSalespersons(false);
                setIsLoadingPlans(false);
                setIsLoadingItems(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const state = location.state as { customerId?: string; customerName?: string; draft?: any } | null;
        const customerId = state?.customerId || state?.draft?.customerId || formData.customerId;
        const customerName = state?.customerName || state?.draft?.customerName || formData.customerName;
        if (!customerId) return;
        if (formData.customerId && selectedCustomer) return;
        const match = customers.find((c) => String(c.id || (c as any)._id) === String(customerId));
        if (match) {
            handleCustomerSelect(match);
        } else if (!formData.customerId) {
            setFormData((prev) => ({
                ...prev,
                customerId: customerId || "",
                customerName: customerName || prev.customerName,
            }));
        }
    }, [location.state, customers, formData.customerId, selectedCustomer]);

    useEffect(() => {
        const draft = (location.state as any)?.draft;
        if (!draft) return;
        setFormData((prev) => ({ ...prev, ...draft }));
        if (Array.isArray(draft.addonLines)) {
            setAddonLines(draft.addonLines);
        }
    }, [location.state]);

    useEffect(() => {
        if (draftHydratedRef.current) return;
        const stateDraft = (location.state as any)?.draft;
        if (!stateDraft && subscriptionId) {
            try {
                const rawList = localStorage.getItem("taban_subscriptions_v1");
                const list = rawList ? JSON.parse(rawList) : [];
                const rows = Array.isArray(list) ? list : [];
                const found = rows.find((row: any) => String(row?.id) === String(subscriptionId));
                if (found) {
                    const draftFromSubscription = {
                        id: String(found?.id || ""),
                        customerId: String(found?.customerId || ""),
                        customerName: String(found?.customerName || ""),
                        contactPersons: Array.isArray(found?.contactPersons)
                            ? found.contactPersons
                            : found?.customerEmail
                            ? [{ email: found.customerEmail }]
                            : [],
                        currency: String(found?.amount || "").match(/^[A-Za-z]+/)?.[0] || "USD",
                        productId: String(found?.productId || ""),
                        productName: String(found?.productName || found?.planName || ""),
                        planName: String(found?.planName || "Select a Plan"),
                        planDescription: String(found?.planDescription || ""),
                        quantity: Number(found?.quantity || 1) || 1,
                        price: Number(found?.price || 0) || 0,
                        basePrice: Number(found?.basePrice || 0) || 0,
                        tax: String(found?.tax || "Select a Tax"),
                        taxRate: Number(found?.taxRate || 0) || 0,
                        taxPreference: String(found?.taxPreference || "Tax Exclusive"),
                        contentType: String(found?.contentType || "product"),
                        items: Array.isArray(found?.items) ? found.items : initialFormData.items,
                        customerNotes: String(found?.customerNotes || ""),
                        expiresAfter: String(found?.expiresAfter || ""),
                        neverExpires: Boolean(found?.neverExpires ?? false),
                        tag: String(found?.tag || ""),
                        reportingTags: Array.isArray(found?.reportingTags) ? found.reportingTags : [],
                        startDate: String(found?.activatedOn || found?.startDate || initialFormData.startDate),
                        coupon: String(found?.coupon || ""),
                        couponCode: String(found?.couponCode || ""),
                        couponValue: String(found?.couponValue || "0.00"),
                        billingAddress: found?.billingAddress ?? null,
                        shippingAddress: found?.shippingAddress ?? null,
                        priceListId: String(found?.priceListId || ""),
                        priceListName: String(found?.priceListName || "Select Price List"),
                        location: String(found?.location || "Head Office"),
                        subscriptionNumber: String(found?.subscriptionNumber || ""),
                        referenceNumber: String(found?.referenceNumber || ""),
                        salesperson: String(found?.salesperson || ""),
                        salespersonName: String(found?.salespersonName || ""),
                        meteredBilling: Boolean(found?.meteredBilling ?? initialFormData.meteredBilling),
                        paymentMode: String(found?.paymentMode || initialFormData.paymentMode),
                        paymentTerms: String(found?.paymentTerms || initialFormData.paymentTerms),
                        partialPayments: Boolean(found?.partialPayments ?? initialFormData.partialPayments),
                        prorateCharges: Boolean(found?.prorateCharges ?? initialFormData.prorateCharges),
                        generateInvoices: Boolean(found?.generateInvoices ?? initialFormData.generateInvoices),
                        invoiceTemplate: String(found?.invoiceTemplate || initialFormData.invoiceTemplate),
                        roundOffPreference: String(found?.roundOffPreference || initialFormData.roundOffPreference),
                        createdOn: String(found?.createdOn || ""),
                        activatedOn: String(found?.activatedOn || ""),
                        lastBilledOn: String(found?.lastBilledOn || ""),
                        nextBillingOn: String(found?.nextBillingOn || ""),
                        status: String(found?.status || ""),
                        addonLines: Array.isArray(found?.addonLines) ? found.addonLines : defaultAddonLines,
                    };
                    setFormData((prev) => ({ ...prev, ...draftFromSubscription }));
                    if (Array.isArray(found?.addonLines)) {
                        setAddonLines(found.addonLines);
                    }
                    draftHydratedRef.current = true;
                    return;
                }
            } catch {
                // ignore storage errors
            }
        }
        const raw = sessionStorage.getItem("taban_subscription_draft_v1");
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            setFormData((prev) => ({ ...prev, ...draft }));
            if (Array.isArray(draft.addonLines)) {
                setAddonLines(draft.addonLines);
            }
            draftHydratedRef.current = true;
        } catch {
            // ignore invalid draft
        }
    }, []);

    useEffect(() => {
        let shouldClear = false;
        try {
            shouldClear = sessionStorage.getItem("taban_subscription_clear_v1") === "1";
            if (shouldClear) {
                sessionStorage.removeItem("taban_subscription_clear_v1");
            }
        } catch {
            // ignore storage errors
        }
        if (!shouldClear) return;
        setFormData(initialFormData);
        setAddonLines(defaultAddonLines);
        setSelectedCustomer(null);
        setBillingAddress(null);
        setShippingAddress(null);
        setCustomerSearch("");
    }, []);

    useEffect(() => {
        const refreshSalespersons = async () => {
            try {
                const data = await getSalespersonsFromAPI();
                setSalespersons(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to refresh salespersons:", error);
            }
        };

        const onFocus = () => {
            refreshSalespersons();
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, []);

    // Refresh products when user opens dropdown or returns to page after adding product.
    useEffect(() => {
        const refreshProducts = () => {
            const productsRows = readRows("inv_products_v1");
            setProducts(mapProductsRows(productsRows));
        };

        if (isProductDropdownOpen) {
            refreshProducts();
        }

        const onStorage = (event: StorageEvent) => {
            if (!event.key || event.key === "inv_products_v1") {
                refreshProducts();
            }
        };
        const onFocus = () => refreshProducts();

        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", onFocus);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", onFocus);
        };
    }, [isProductDropdownOpen]);

    useEffect(() => {
        const loadCoupons = () => {
            try {
                const rows = readRows("inv_coupons_v1");
                const mapped: CouponOption[] = rows
                    .map((row: any, idx: number) => {
                        const statusValue =
                            row?.status ??
                            row?.Status ??
                            row?.couponStatus ??
                            row?.state ??
                            row?.statusLabel ??
                            row?.statusText;
                        const rawActive =
                            row?.active ??
                            row?.isActive ??
                            row?.is_active ??
                            row?.enabled;
                        const rawInactive =
                            row?.inactive ??
                            row?.isInactive ??
                            row?.is_inactive ??
                            row?.disabled;
                        const activeValue =
                            typeof rawInactive !== "undefined" ? !rawInactive : rawActive;
                        return {
                            id: String(row?.id || row?._id || `coupon-${idx}`),
                            couponName: String(row?.couponName || row?.name || "").trim(),
                            couponCode: String(row?.couponCode || row?.code || "").trim(),
                            discountType: String(row?.discountType || "Flat"),
                            discountValue: Number(row?.discountValue ?? row?.value ?? 0) || 0,
                            status: String(statusValue || ""),
                            active: typeof activeValue === "boolean" ? activeValue : undefined,
                            product: String(row?.product || row?.productName || "").trim(),
                            productId: String(row?.productId || "").trim(),
                        };
                    })
                    .filter((row: CouponOption) => row.couponName && row.couponCode);
                setCoupons(mapped);
            } catch {
                setCoupons([]);
            }
        };
        loadCoupons();
        const onStorage = (event: StorageEvent) => {
            if (!event.key || event.key === "inv_coupons_v1") loadCoupons();
        };
        const onFocus = () => loadCoupons();
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", onFocus);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target as Node)) {
                setIsPhoneCodeDropdownOpen(false);
            }
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
                setCountrySearch("");
            }
            if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
                setIsStateDropdownOpen(false);
                setStateSearch("");
            }
            if (digitalServiceRef.current && !digitalServiceRef.current.contains(event.target as Node)) {
                setIsDigitalServiceOpen(false);
            }
            if (couponDropdownRef.current && !couponDropdownRef.current.contains(event.target as Node)) {
                setIsCouponDropdownOpen(false);
            }
            const menuEntries = Object.entries(itemMenuRefs.current);
            if (menuEntries.length > 0) {
                let clickedInsideMenu = false;
                for (const [, ref] of menuEntries) {
                    if (ref && ref.contains(event.target as Node)) {
                        clickedInsideMenu = true;
                        break;
                    }
                }
                if (!clickedInsideMenu) {
                    setOpenItemMenus({});
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!formData.customerId) {
            setSelectedCustomer(null);
            setBillingAddress(null);
            setShippingAddress(null);
            return;
        }
        const match = customers.find(
            (customer) => String(customer.id || (customer as any)._id) === String(formData.customerId)
        );
        if (match) {
            setSelectedCustomer(match);
        }
    }, [formData.customerId, customers]);

    useEffect(() => {
        if (!selectedCustomer) {
            setBillingAddress(null);
            setShippingAddress(null);
            return;
        }

        const normalizeAddress = (address: any) => {
            if (!address) return null;
            const rawPhone = String(address.phone || "").trim();
            const phoneCodeMatch = rawPhone.match(/^(\+\d{1,5})\s*/);
            const phoneCountryCode = phoneCodeMatch ? phoneCodeMatch[1] : "";
            const phone = phoneCodeMatch ? rawPhone.replace(phoneCodeMatch[0], "").trim() : rawPhone;
            const normalized = {
                attention: address.attention || "",
                country: address.country || "",
                street1: address.street1 || "",
                street2: address.street2 || "",
                city: address.city || "",
                state: address.state || "",
                zipCode: address.zipCode || "",
                phoneCountryCode,
                phone,
                fax: address.fax || "",
            };
            return isEmptyAddress(normalized) ? null : normalized;
        };

        const nextBilling = normalizeAddress((selectedCustomer as any).billingAddress);
        const nextShipping = normalizeAddress((selectedCustomer as any).shippingAddress);
        setBillingAddress(nextBilling);
        setShippingAddress(nextShipping);
        setFormData((prev) => ({
            ...prev,
            billingAddress: nextBilling,
            shippingAddress: nextShipping,
        }));
    }, [selectedCustomer]);

    useEffect(() => {
        if (!addressFormData.state) return;
        if (!stateOptions.length) return;
        const exists = stateOptions.some(
            (state: any) => String(state.name || "").toLowerCase() === String(addressFormData.state || "").toLowerCase()
        );
        if (!exists) {
            setAddressFormData((prev) => ({ ...prev, state: "" }));
        }
    }, [addressFormData.state, stateOptions]);

    useEffect(() => {
        if (addressFormData.phoneCountryCode) return;
        const country = countryOptions.find(
            (entry: any) => String(entry.name || "").toLowerCase() === String(addressFormData.country || "").toLowerCase()
        );
        if (country?.phonecode) {
            setAddressFormData((prev) => ({ ...prev, phoneCountryCode: `+${country.phonecode}` }));
        }
    }, [addressFormData.country, addressFormData.phoneCountryCode, countryOptions]);

    useEffect(() => {
        const countryName = String(addressFormData.country || "").trim().toLowerCase();
        if (!countryName) return;
        const match = PHONE_COUNTRY_OPTIONS.find(
            (entry) => String(entry.name || "").trim().toLowerCase() === countryName
        );
        if (match?.phoneCode) {
            setAddressFormData((prev) => ({ ...prev, phoneCountryCode: match.phoneCode }));
        }
    }, [addressFormData.country]);
    // Helper Functions
    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const parsePercentage = (value: any) => {
        const raw = String(value || "").replace(/[^0-9.-]/g, "");
        const num = Number(raw);
        return Number.isFinite(num) ? num : 0;
    };

    const applyRounding = (value: number, roundOffTo: string) => {
        const label = String(roundOffTo || "").toLowerCase();
        if (label.includes("decimal places")) {
            const digits = Number(label.split(" ")[0]);
            if (Number.isFinite(digits)) return Number(value.toFixed(digits));
        }
        if (label.includes("nearest whole")) {
            return Math.round(value);
        }
        if (label.includes("0.99")) {
            return Math.floor(value) + 0.99;
        }
        if (label.includes("0.50")) {
            return Math.floor(value) + 0.5;
        }
        if (label.includes("0.49")) {
            return Math.floor(value) + 0.49;
        }
        return value;
    };

    const applyPriceListRate = (baseRate: number, priceList: any) => {
        if (!priceList) return baseRate;
        if (String(priceList.priceListType || "").toLowerCase() === "individual") {
            return baseRate;
        }
        const pct = parsePercentage(priceList.markup);
        if (!pct) return baseRate;
        const type = String(priceList.markupType || "").toLowerCase();
        const next =
            type === "markdown"
                ? baseRate * (1 - pct / 100)
                : baseRate * (1 + pct / 100);
        return applyRounding(next, priceList.roundOffTo || "Never mind");
    };

    const selectedPriceList = useMemo(() => {
        if (!formData.priceListId) return null;
        return priceLists.find((pl) => String(pl.id) === String(formData.priceListId)) || null;
    }, [priceLists, formData.priceListId]);

    const getProductRateOverride = (name: string, type: "plan" | "addon") => {
        const list = selectedPriceList;
        if (!list || String(list.priceListType || "").toLowerCase() !== "individual") return null;
        const normalize = (value: any) => String(value || "").trim().toLowerCase();
        const selectedProductId = String(formData.productId || "").trim();
        const productName = String(selectedProductName || formData.productName || "").trim();
        const productRates = Array.isArray(list.productRates) ? list.productRates : [];
        const productRow = productRates.find((row: any) => {
            const rowId = String(row.productId || "").trim();
            const rowName = String(row.productName || "").trim();
            return (
                (rowId && rowId === selectedProductId) ||
                (rowName && rowName === productName)
            );
        });
        if (!productRow) return null;
        const listItems = type === "plan" ? productRow.plans || [] : productRow.addons || [];
        const match = listItems.find((item: any) => normalize(item.name) === normalize(name));
        if (!match) return null;
        const rate = Number(match.rate ?? match.price);
        return Number.isFinite(rate) ? rate : null;
    };

    useEffect(() => {
        const priceList = selectedPriceList;
        setFormData((prev) => {
            const baseRate = Number(prev.basePrice ?? prev.price ?? 0) || 0;
            const overrideRate = getProductRateOverride(prev.planName, "plan");
            const nextRate =
                overrideRate !== null
                    ? overrideRate
                    : (priceList ? applyPriceListRate(baseRate, priceList) : baseRate);
            const nextCurrency = priceList?.currency || prev.currency;
            if (prev.price === nextRate && prev.currency === nextCurrency) return prev;
            return { ...prev, price: nextRate, currency: nextCurrency };
        });
        setAddonLines((prev) =>
            prev.map((line) => {
                const baseRate = Number(line.baseRate ?? line.rate ?? 0) || 0;
                const overrideRate = getProductRateOverride(line.addonName, "addon");
                const nextRate =
                    overrideRate !== null
                        ? overrideRate
                        : (priceList ? applyPriceListRate(baseRate, priceList) : baseRate);
                const amount = (Number(line.quantity) || 0) * nextRate + ((Number(line.quantity) || 0) * nextRate * (Number(line.taxRate) || 0)) / 100;
                return { ...line, baseRate, rate: nextRate, amount };
            })
        );
    }, [selectedPriceList]);

    useEffect(() => {
        if (!formData.priceListId) return;
        const match = priceLists.find((pl) => String(pl.id) === String(formData.priceListId));
        if (match && formData.priceListName !== match.name) {
            setFormData((prev) => ({ ...prev, priceListName: match.name }));
        }
    }, [priceLists, formData.priceListId, formData.priceListName]);

    const handleCustomerSelect = (customer: Customer) => {
        const primaryContactValue = customer.contactPersons?.find(p => p.isPrimary) || (customer.email ? { email: customer.email } : null);
        const resolvedBillingAddress =
            (customer as any).billingAddress ||
            (customer as any).billing_address ||
            (customer as any).billing ||
            null;
        const resolvedShippingAddress =
            (customer as any).shippingAddress ||
            (customer as any).shipping_address ||
            (customer as any).shipping ||
            null;
        const normalizeAddress = (address: any) => {
            if (!address) return null;
            const rawPhone = String(address.phone || "").trim();
            const phoneCodeMatch = rawPhone.match(/^(\+\d{1,5})\s*/);
            const phoneCountryCode = phoneCodeMatch ? phoneCodeMatch[1] : "";
            const phone = phoneCodeMatch ? rawPhone.replace(phoneCodeMatch[0], "").trim() : rawPhone;
            const normalized = {
                attention: address.attention || "",
                country: address.country || "",
                street1: address.street1 || "",
                street2: address.street2 || "",
                city: address.city || "",
                state: address.state || "",
                zipCode: address.zipCode || "",
                phoneCountryCode,
                phone,
                fax: address.fax || "",
            };
            return isEmptyAddress(normalized) ? null : normalized;
        };
        const normalizedBillingAddress = normalizeAddress(resolvedBillingAddress);
        const normalizedShippingAddress = normalizeAddress(resolvedShippingAddress);

        setFormData(prev => ({
            ...prev,
            customerId: String((customer as any).id || (customer as any)._id || ""),
            customerName: customer.name || customer.displayName || "",
            currency: customer.currency || "AMD",
            priceListId: String((customer as any).priceListId || ""),
            priceListName: (priceLists.find(pl => String(pl.id) === String((customer as any).priceListId))?.name) || prev.priceListName,
            billingAddress: normalizedBillingAddress,
            shippingAddress: normalizedShippingAddress,
            contactPersons: primaryContactValue ? [{ email: (primaryContactValue as any).email, selected: true }] : []
        }));
        setSelectedCustomer(customer);
        setBillingAddress(normalizedBillingAddress);
        setShippingAddress(normalizedShippingAddress);
        setCustomerSearch("");
        setIsCustomerDropdownOpen(false);
    };

    const openAddressModal = (type: "billing" | "shipping") => {
        const source = type === "billing" ? billingAddress : shippingAddress;
        setAddressModalType(type);
        setAddressFormData({
            attention: source?.attention || "",
            country: source?.country || "",
            street1: source?.street1 || "",
            street2: source?.street2 || "",
            city: source?.city || "",
            state: source?.state || "",
            zipCode: source?.zipCode || "",
            phoneCountryCode: source?.phoneCountryCode || "",
            phone: source?.phone || "",
            fax: source?.fax || "",
        });
        setCountrySearch("");
        setStateSearch("");
        setPhoneCodeSearch("");
        setIsPhoneCodeDropdownOpen(false);
        setIsAddressModalOpen(true);
    };

    const handleAddressFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAddressFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveAddress = async () => {
        const customerId = formData.customerId || String(selectedCustomer?.id || (selectedCustomer as any)?._id || "");
        if (!customerId) {
            toast.error("Please select a saved customer to add an address.");
            return;
        }

        setIsAddressSaving(true);
        try {
            const addressPayload = {
                attention: String(addressFormData.attention || "").trim(),
                country: String(addressFormData.country || "").trim(),
                street1: String(addressFormData.street1 || "").trim(),
                street2: String(addressFormData.street2 || "").trim(),
                city: String(addressFormData.city || "").trim(),
                state: String(addressFormData.state || "").trim(),
                zipCode: String(addressFormData.zipCode || "").trim(),
                phone: `${String(addressFormData.phoneCountryCode || "").trim()} ${String(addressFormData.phone || "").trim()}`.trim(),
                fax: String(addressFormData.fax || "").trim(),
                phoneCountryCode: String(addressFormData.phoneCountryCode || "").trim(),
            };

            const payload =
                addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload };

            const response: any = await customersAPI.update(String(customerId), payload);
            const updatedFromApi = response?.data || response;

            setCustomers((prev) =>
                prev.map((customer: any) =>
                    String(customer.id || customer._id) === String(customerId)
                        ? {
                            ...customer,
                            ...(updatedFromApi || {}),
                            ...(addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload }),
                        }
                        : customer
                )
            );

            setSelectedCustomer((prev: any) =>
                prev
                    ? {
                        ...prev,
                        ...(updatedFromApi || {}),
                        ...(addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload }),
                    }
                    : prev
            );

            if (addressModalType === "billing") {
                setBillingAddress(addressPayload);
            } else {
                setShippingAddress(addressPayload);
            }

            setFormData((prev) => ({
                ...prev,
                ...(addressModalType === "billing" ? { billingAddress: addressPayload } : { shippingAddress: addressPayload }),
            }));

            setIsAddressModalOpen(false);
        } catch (error) {
            console.error("Failed to save customer address:", error);
            toast.error("Failed to save address.");
        } finally {
            setIsAddressSaving(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        return customers.filter(c =>
            (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.email || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.id || "").toLowerCase().includes(customerSearch.toLowerCase())
        );
    }, [customers, customerSearch]);

    const activeSalespersons = useMemo(() => {
        return salespersons.filter(s => s.status?.toLowerCase() !== 'inactive');
    }, [salespersons]);

    const activeProducts = useMemo(() => {
        const selectedProductId = String(formData.productId || "").trim();
        const selectedProductName = normalizeText(formData.productName);
        return products.filter((p) => {
            const isActive = resolveActiveFlag(p.status, p.active);
            if (isActive) return true;
            if (!isEditMode) return false;
            if (selectedProductId && String(p.id) === selectedProductId) return true;
            if (selectedProductName && normalizeText(p.name) === selectedProductName) return true;
            if (p.code && selectedProductName && normalizeText(p.code) === selectedProductName) return true;
            return false;
        });
    }, [products, isEditMode, formData.productId, formData.productName, normalizeText, resolveActiveFlag]);

    const filteredProducts = useMemo(() => {
        const term = productSearch.toLowerCase().trim();
        if (!term) return activeProducts;
        return activeProducts.filter((p) => p.name.toLowerCase().includes(term));
    }, [activeProducts, productSearch]);

    const filteredSalespersons = useMemo(() => {
        const term = salespersonSearch.toLowerCase().trim();
        if (!term) return activeSalespersons;
        return activeSalespersons.filter((s) =>
            String(s.name || "").toLowerCase().includes(term) ||
            String(s.email || "").toLowerCase().includes(term)
        );
    }, [activeSalespersons, salespersonSearch]);

    const selectedProductName = useMemo(() => {
        const found = activeProducts.find((p) => p.id === formData.productId);
        return found?.name || formData.productName || "";
    }, [activeProducts, formData.productId, formData.productName]);

    useEffect(() => {
        if (formData.productId || !formData.productName || !activeProducts.length) return;
        const normalized = normalizeText(formData.productName);
        const match = activeProducts.find((p) => {
            const byName = normalizeText(p.name) === normalized;
            const byCode = p.code ? normalizeText(p.code) === normalized : false;
            return byName || byCode;
        });
        if (!match) return;
        setFormData((prev) => ({ ...prev, productId: match.id, productName: match.name }));
    }, [formData.productId, formData.productName, activeProducts, normalizeText]);

    const availablePlanAddons = useMemo(() => {
        const selectedProductId = String(formData.productId || "").trim();
        const productKey = normalizeText(selectedProductName);
        const selectedProduct = activeProducts.find((p) => p.id === selectedProductId);
        const selectedAliases = new Set(
            [selectedProductId, selectedProductName, selectedProduct?.code]
                .map((v) => normalizeText(v))
                .filter(Boolean)
        );
        const selectedAddonNames = new Set(
            [
                normalizeText(formData.planName),
                ...addonLines.map((line) => normalizeText(line.addonName)),
            ].filter(Boolean)
        );
        const rows = planAddons.filter((row) => {
            const isActive = resolveActiveFlag(row.status, row.active);
            if (!isActive) {
                if (!isEditMode) return false;
                const nameMatch = selectedAddonNames.has(normalizeText(row.name));
                if (!nameMatch) return false;
            }
            if (!productKey) return false;
            const rowProductId = String(row.productId || "").trim();
            const rowProductName = normalizeText(row.productName);
            const rowAliases = new Set([normalizeText(rowProductId), rowProductName].filter(Boolean));
            for (const alias of selectedAliases) {
                if (rowAliases.has(alias)) return true;
            }
            return false;
        });
        const term = normalizeText(planAddonSearch);
        if (!term) return rows;
        return rows.filter((row) => normalizeText(row.name).includes(term) || normalizeText(row.code).includes(term));
    }, [
        planAddons,
        selectedProductName,
        planAddonSearch,
        formData.productId,
        formData.planName,
        addonLines,
        activeProducts,
        normalizeText,
        resolveActiveFlag,
    ]);

    const availableAddons = useMemo(
        () => availablePlanAddons.filter((row) => row.type === "addon"),
        [availablePlanAddons]
    );

    const selectedSalesperson = useMemo(
        () => activeSalespersons.find((s) => String(s.id || s._id) === String(formData.salesperson)),
        [activeSalespersons, formData.salesperson]
    );

    const handleProductSelect = (product: ProductOption) => {
        setFormData((prev) => ({
            ...prev,
            productId: product.id,
            productName: product.name,
            planName: "Select a Plan",
            price: 0,
        }));
        setProductSearch("");
        setPlanAddonSearch("");
        setIsProductDropdownOpen(false);
        setIsPlanAddonDropdownOpen(false);
    };

    const handlePlanAddonSelect = (row: PlanAddonOption) => {
        const normalizedTaxName = String(
            (row as any).taxName ||
            (row as any).tax?.name ||
            (row as any).tax ||
            (row as any).taxLabel ||
            ""
        ).trim();
        const normalizedTaxId = String(
            (row as any).taxId ||
            (row as any).tax_id ||
            (row as any).tax?._id ||
            (row as any).tax?.id ||
            ""
        ).trim();
        const normalizedTaxRate = Number(
            (row as any).taxRate ??
            (row as any).tax_rate ??
            (row as any).taxPercent ??
            (row as any).tax?.rate ??
            NaN
        );
        const matchedTax =
            taxes.find((t) => String(t.id || (t as any)._id || "") === normalizedTaxId) ||
            taxes.find((t) => String(t.name || "").trim().toLowerCase() === normalizedTaxName.toLowerCase()) ||
            (Number.isFinite(normalizedTaxRate)
                ? taxes.find((t) => Number(t.rate) === normalizedTaxRate)
                : undefined);
        setFormData((prev) => {
            const baseRate = Number(row.rate || 0) || 0;
            const overrideRate = getProductRateOverride(row.name, "plan");
            const nextRate =
                overrideRate !== null
                    ? overrideRate
                    : (selectedPriceList ? applyPriceListRate(baseRate, selectedPriceList) : baseRate);
            return {
                ...prev,
                planName: row.name,
                basePrice: baseRate,
                price: nextRate,
                tax: matchedTax ? matchedTax.name : prev.tax,
            };
        });
        setPlanAddonSearch("");
        setIsPlanAddonDropdownOpen(false);
        setAddonLines([{ id: 1, addonName: "", description: "", quantity: 1, rate: 0, baseRate: 0, tax: "Select a Tax", taxRate: 0, amount: 0 }]);
    };

    useEffect(() => {
        if (!formData.coupon) return;
        const stillValid = activeCoupons.some((coupon) => coupon.couponName === formData.coupon);
        if (!stillValid) {
            setFormData((prev) => ({ ...prev, coupon: "", couponCode: "", couponValue: "0.00" }));
        }
    }, [activeCoupons, formData.coupon]);


    const formatAddressLines = (addr: any) => {
        if (!addr) return [];
        const line1 = [addr.street1, addr.street2].filter(Boolean).join(" ").trim();
        const line2 = [addr.city, addr.state, addr.country].filter(Boolean).join(", ").trim();
        const rawPhone = addr.phone || addr.phoneNumber || addr.mobile || addr.mobilePhone || "";
        const phone =
            addr.phoneCountryCode && String(rawPhone || "").trim() && !String(rawPhone).startsWith(String(addr.phoneCountryCode))
                ? `${addr.phoneCountryCode} ${rawPhone}`.trim()
                : rawPhone;
        const lines = [line1, line2].filter(Boolean);
        if (addr.zipCode) {
            const lastIndex = lines.length - 1;
            if (lastIndex >= 0) {
                lines[lastIndex] = `${lines[lastIndex]} ${addr.zipCode}`.trim();
            } else {
                lines.push(String(addr.zipCode));
            }
        }
        if (phone) {
            lines.push(`Phone: ${phone}`);
        }
        return lines;
    };

    const buildEmptyItem = (id: number) => ({
        id,
        itemDetails: "",
        quantity: 1,
        rate: 0,
        tax: "Select a Tax",
        taxRate: 0,
        amount: 0,
        description: "",
        account: "",
        reportingTag: "",
        imageUrl: "",
        sku: "",
        showAdditional: true,
        isHeader: false,
        headerText: "",
    });

    const buildHeaderItem = (id: number) => ({
        id,
        itemDetails: "",
        quantity: 0,
        rate: 0,
        tax: "Select a Tax",
        taxRate: 0,
        amount: 0,
        description: "",
        account: "",
        reportingTag: "",
        imageUrl: "",
        sku: "",
        showAdditional: false,
        isHeader: true,
        headerText: "",
    });

    const handleAddItem = () => {
        const newId = formData.items.length > 0 ? Math.max(...formData.items.map((i: any) => i.id)) + 1 : 1;
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                buildEmptyItem(newId)
            ]
        }));
    };

    const handleRemoveItem = (id: number) => {
        if (formData.items.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((i: any) => i.id !== id)
        }));
    };

    const handleItemChange = (id: number, field: string, value: any) => {
        setFormData(prev => {
            const newItems = prev.items.map((item: any) => {
                if (item.id === id) {
                    if (item.isHeader) {
                        return { ...item, [field]: value };
                    }
                    const updatedItem = { ...item, [field]: value };
                    if (field === 'quantity' || field === 'rate') {
                        updatedItem.amount = (Number(updatedItem.quantity) || 0) * (Number(updatedItem.rate) || 0);
                    }
                    return updatedItem;
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };

    const handleSelectItem = (id: number, item: any) => {
        const newItems = formData.items.map(it => {
            if (it.id === id) {
                const displayName = getItemDisplayName(item);
                const rate = getItemRate(item);
                return {
                    ...it,
                    itemDetails: displayName,
                    rate,
                    description: item.description || item.salesDescription || item.purchaseDescription || "",
                    imageUrl: getItemImageUrl(item),
                    sku: getItemSku(item),
                    amount: (it.quantity || 1) * rate
                };
            }
            return it;
        });
        setFormData(prev => ({ ...prev, items: newItems }));
        setOpenItemDropdowns(prev => ({ ...prev, [id]: false }));
        setItemSearches(prev => ({ ...prev, [id]: "" }));
    };

    const handleSelectTax = (id: number, tax: Tax) => {
        const newItems = formData.items.map(it => {
            if (it.id === id) {
                return {
                    ...it,
                    tax: tax.name,
                    taxRate: tax.rate
                };
            }
            return it;
        });
        setFormData(prev => ({ ...prev, items: newItems }));
        setOpenTaxDropdowns(prev => ({ ...prev, [id]: false }));
    };

    const insertItemAt = (index: number, item: any) => {
        setFormData((prev) => {
            const next = [...prev.items];
            next.splice(index, 0, item);
            return { ...prev, items: next };
        });
    };

    const handleToggleAdditionalInfo = (id: number) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item: any) =>
                item.id === id ? { ...item, showAdditional: !item.showAdditional } : item
            ),
        }));
    };

    const handleCloneItemRow = (id: number) => {
        setFormData((prev) => {
            const index = prev.items.findIndex((i: any) => i.id === id);
            if (index < 0) return prev;
            const nextId = Math.max(0, ...prev.items.map((i: any) => i.id)) + 1;
            const clone = { ...prev.items[index], id: nextId };
            const next = [...prev.items];
            next.splice(index + 1, 0, clone);
            return { ...prev, items: next };
        });
    };

    const handleInsertNewRow = (id: number) => {
        setFormData((prev) => {
            const index = prev.items.findIndex((i: any) => i.id === id);
            const nextId = Math.max(0, ...prev.items.map((i: any) => i.id)) + 1;
            const newItem = buildEmptyItem(nextId);
            const next = [...prev.items];
            next.splice(index + 1, 0, newItem);
            return { ...prev, items: next };
        });
    };

    const handleInsertHeaderRow = (id: number) => {
        setFormData((prev) => {
            const index = prev.items.findIndex((i: any) => i.id === id);
            const nextId = Math.max(0, ...prev.items.map((i: any) => i.id)) + 1;
            const newItem = buildHeaderItem(nextId);
            const next = [...prev.items];
            next.splice(index + 1, 0, newItem);
            return { ...prev, items: next };
        });
    };

    const handleAddonSelect = (lineId: number, addon: PlanAddonOption) => {
        setAddonLines((prev) =>
            prev.map((line) => {
                if (line.id !== lineId) return line;
                const baseRate = Number(addon.rate || 0);
                const overrideRate = getProductRateOverride(addon.name, "addon");
                const rate =
                    overrideRate !== null
                        ? overrideRate
                        : (selectedPriceList ? applyPriceListRate(baseRate, selectedPriceList) : baseRate);
                const amount = (Number(line.quantity) || 0) * rate + ((Number(line.quantity) || 0) * rate * (Number(line.taxRate) || 0)) / 100;
                return {
                    ...line,
                    addonId: addon.id,
                    addonName: addon.name,
                    baseRate,
                    rate,
                    amount,
                };
            })
        );
    };

    const formatCouponValue = (coupon: CouponOption) => {
        const isPercent = normalizeText(coupon.discountType).includes("percent");
        if (isPercent) return `${coupon.discountValue}%`;
        return `AMD${coupon.discountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleCouponSelect = (coupon: CouponOption) => {
        setFormData((prev) => ({
            ...prev,
            coupon: coupon.couponName,
            couponCode: coupon.couponCode,
            couponValue: formatCouponValue(coupon),
        }));
        setIsCouponDropdownOpen(false);
        setCouponSearch("");
    };

    const getItemDisplayName = (item: any) =>
        String(item?.name || item?.itemName || item?.productName || item?.title || "").trim();

    const getItemRate = (item: any) =>
        Number(item?.rate ?? item?.sellingPrice ?? item?.price ?? item?.salesRate ?? 0) || 0;

    const getItemSku = (item: any) =>
        String(item?.sku || item?.itemCode || item?.code || "").trim();

    const getItemImageUrl = (item: any) => {
        const direct =
            item?.imageUrl ||
            item?.imageURL ||
            item?.image_url ||
            item?.itemImage ||
            item?.thumbnail ||
            item?.thumbnailUrl ||
            item?.thumbnailURL ||
            item?.photo ||
            item?.photoUrl ||
            item?.avatar ||
            item?.image;
        if (typeof direct === "string") return direct.trim();
        if (direct && typeof direct === "object") {
            const nested = direct.url || direct.href || direct.path || direct.src;
            if (typeof nested === "string") return nested.trim();
        }
        const imagesArray = Array.isArray(item?.images) ? item.images : [];
        if (imagesArray.length > 0) {
            const first = imagesArray[0];
            if (typeof first === "string") return first.trim();
            if (first && typeof first === "object") {
                const nested = first.url || first.href || first.path || first.src;
                if (typeof nested === "string") return nested.trim();
            }
        }
        const attachments = Array.isArray(item?.attachments) ? item.attachments : [];
        if (attachments.length > 0) {
            const first = attachments[0];
            if (typeof first === "string") return first.trim();
            if (first && typeof first === "object") {
                const nested = first.url || first.href || first.path || first.src;
                if (typeof nested === "string") return nested.trim();
            }
        }
        return "";
    };

    const filteredItemOptions = (search: string) => {
        const term = (search || "").toLowerCase();
        return availableItems.filter(item => {
            const name = getItemDisplayName(item).toLowerCase();
            const sku = getItemSku(item).toLowerCase();
            return name.includes(term) || sku.includes(term);
        });
    };

    const totalItemAmount = useMemo(() => {
        return formData.items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    }, [formData.items]);

    const handleAddBulkItems = () => {
        const newItems = [...formData.items];
        let currentMaxId = newItems.length > 0 ? Math.max(...newItems.map((i: any) => i.id)) : 0;

        selectedBulkItems.forEach(itemId => {
            const item = availableItems.find(i => String(i.id || i._id) === itemId);
            if (item) {
                const displayName = getItemDisplayName(item);
                const rate = getItemRate(item);
                const qty = Math.max(1, Number(bulkItemQuantities[itemId] || 1));
                // Remove the first empty row if it exists
                if (newItems.length === 1 && !newItems[0].itemDetails) {
                    newItems.pop();
                }

                currentMaxId++;
                newItems.push({
                    id: currentMaxId,
                    itemDetails: displayName,
                    quantity: qty,
                    rate,
                    tax: item.taxName || "Select a Tax",
                    taxRate: item.taxRate || 0,
                    amount: rate * qty,
                    description: item.description || item.salesDescription || item.purchaseDescription || "",
                    account: "",
                    reportingTag: "",
                    imageUrl: getItemImageUrl(item),
                    sku: getItemSku(item),
                    showAdditional: true,
                    isHeader: false,
                    headerText: "",
                });
            }
        });

        setFormData(prev => ({ ...prev, items: newItems }));
        setIsBulkItemsModalOpen(false);
        setSelectedBulkItems([]);
        setBulkItemQuantities({});
    };

    return (
        <div className="flex flex-col h-[calc(100vh-72px)] bg-white font-sans text-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex-none px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h1 className="text-lg font-medium text-slate-800">{isEditMode ? "Edit Subscription" : "New Subscription"}</h1>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="px-8 py-8 max-w-6xl pb-32">
                    <div className="flex flex-col gap-10">

                    {/* Main Content */}
                    <div className="space-y-10">

                        {/* Customer Section */}
                        <div className="flex items-start justify-between gap-12">
                            <div className="flex-1 space-y-5 max-w-3xl">
                                {/* Customer Name Row */}
                                <div className="flex items-center gap-8">
                                    <label className="text-[13px] font-medium text-[#ef4444] w-36 shrink-0">Customer Name*</label>
                                    <div className="flex items-stretch gap-0 flex-1 relative" ref={customerDropdownRef}>
                                        <div className="relative flex-1">
                                            <button
                                                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                                                className={`w-full h-[34px] px-3 border border-gray-300 rounded-l-md rounded-r-none text-[13px] outline-none text-left bg-white flex items-center justify-between ${!formData.customerName ? 'text-gray-400' : 'text-gray-800'}`}
                                            >
                                                <span>{formData.customerName || "Select or add a customer"}</span>
                                                <ChevronDown size={14} className="text-gray-400" />
                                            </button>

                                            {/* Custom High-Fidelity Dropdown */}
                                            {isCustomerDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[200] overflow-hidden">
                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search customers..."
                                                            className="w-full bg-transparent border-none outline-none text-[13px] py-1"
                                                            value={customerSearch}
                                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="max-h-[300px] overflow-y-auto">
                                                        {isLoadingCustomers ? (
                                                            <div className="p-4 text-center text-[12px] text-gray-400">Loading customers...</div>
                                                        ) : filteredCustomers.length === 0 ? (
                                                            <div className="p-4 text-center text-[12px] text-gray-400">No customers found</div>
                                                        ) : (
                                                            filteredCustomers.map(customer => (
                                                                <button
                                                                    key={customer.id}
                                                                    onClick={() => handleCustomerSelect(customer)}
                                                                    className="w-full text-left px-4 py-3 hover:bg-blue-600 hover:text-white group flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors"
                                                                >
                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-blue-500/30 flex items-center justify-center text-[14px] font-bold text-gray-400 group-hover:text-white shrink-0">
                                                                        {customer.name?.charAt(0) || "C"}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-bold text-[13px] truncate">{customer.name} | {customer.id}</span>
                                                                            {formData.customerId === customer.id && <Check size={14} className="text-white shrink-0" />}
                                                                        </div>
                                                                        <div className="text-[12px] opacity-70 truncate">
                                                                            {customer.email || "No email"} | {customer.companyName || "No Company"}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => navigate("/sales/customers/new")}
                                                        className="w-full p-2.5 text-blue-600 text-[13px] font-medium border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2 justify-center"
                                                    >
                                                        <Plus size={14} /> New Customer
                                                    </button>

                                                </div>
                                            )}
                                        </div>
                                        <button className="h-10 w-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center border border-[#156372] border-l-0">
                                            <Search size={16} />
                                        </button>
                                        {(formData.customerId || formData.customerName) && (
                                            <button className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded text-[11px] font-extrabold text-[#10a37f] hover:bg-gray-50 bg-white">
                                                <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                                </div>
                                                {formData.currency}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={!(formData.customerId || formData.customerName) ? "opacity-30 pointer-events-none transition-all duration-500" : "transition-all duration-500"}>
                                    {/* Addresses Row */}
                                    <div className="flex items-start gap-8 mt-1">
                                        <div className="w-36 shrink-0"></div>
                                        <div className="flex gap-20">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-2 tracking-wide">BILLING ADDRESS</p>
                                                    {billingAddress && (
                                                        <button
                                                            type="button"
                                                            onClick={() => (formData.customerId || formData.customerName) && openAddressModal("billing")}
                                                            className="mb-2 text-blue-500 hover:text-blue-600"
                                                            aria-label="Edit billing address"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                {billingAddress ? (
                                                    <div className="text-[13px] text-gray-700 max-w-[280px] leading-5 space-y-1">
                                                        {formatAddressLines(billingAddress).map((line, idx) => (
                                                            <div key={idx}>{line}</div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => (formData.customerId || formData.customerName) && openAddressModal("billing")}
                                                        className={`text-[13px] mb-2 ${(formData.customerId || formData.customerName) ? "text-blue-600 underline underline-offset-2" : "text-gray-400 cursor-default"}`}
                                                    >
                                                        New Address
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-2 tracking-wide">SHIPPING ADDRESS</p>
                                                    {shippingAddress && (
                                                        <button
                                                            type="button"
                                                            onClick={() => (formData.customerId || formData.customerName) && openAddressModal("shipping")}
                                                            className="mb-2 text-blue-500 hover:text-blue-600"
                                                            aria-label="Edit shipping address"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                {shippingAddress ? (
                                                    <div className="text-[13px] text-gray-700 max-w-[280px] leading-5 space-y-1">
                                                        {formatAddressLines(shippingAddress).map((line, idx) => (
                                                            <div key={idx}>{line}</div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => (formData.customerId || formData.customerName) && openAddressModal("shipping")}
                                                        className={`text-[13px] mb-2 ${(formData.customerId || formData.customerName) ? "text-blue-600 underline underline-offset-2" : "text-gray-400 cursor-default"}`}
                                                    >
                                                        New Address
                                                    </button>
                                                )}
                                            </div>

                                        </div>
                                    </div>

                                    {/* Email Row */}
                                    <div className={`flex items-center gap-8 ${(billingAddress || shippingAddress) ? "mt-4" : ""}`}>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase w-36 shrink-0">E-MAIL TO</label>
                                        <div className="flex items-center gap-2">
                                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded text-[12px] text-gray-600 bg-white hover:border-blue-400 transition-colors">
                                                <PlusCircle size={14} className="text-blue-500" /> New Contact Person
                                            </button>
                                            {formData.contactPersons.map((contact, idx) => (
                                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-[#f0f7ff] border border-[#dbeafe] rounded text-[12px] text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={contact.selected}
                                                        onChange={() => {
                                                            const newContacts = [...formData.contactPersons];
                                                            newContacts[idx].selected = !newContacts[idx].selected;
                                                            handleChange("contactPersons", newContacts);
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-blue-400 text-blue-600 focus:ring-0"
                                                    />
                                                    {contact.email}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Location Row */}
                                    <div className="flex items-center gap-8 mt-4">
                                        <label className="text-[13px] font-normal text-gray-600 w-36 shrink-0">Location</label>
                                        <div className="relative w-64">
                                            <select
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none appearance-none bg-white"
                                                value={formData.location}
                                                onChange={(e) => handleChange("location", e.target.value)}
                                            >
                                                <option>Head Office</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="w-36 shrink-0" />
                                        <div className="relative flex items-center gap-1 text-[12px] text-gray-500" ref={digitalServiceRef}>
                                            <span>VAT MOSS, OSS, &amp; Digital Service Export:</span>
                                            <span className="font-semibold text-gray-700">
                                                {digitalServiceEnabled ? "Enabled" : "Disabled"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsDigitalServiceOpen((prev) => !prev)}
                                                className="text-blue-500 hover:text-blue-600"
                                                aria-label="Edit digital service tracking"
                                            >
                                                <Pencil size={12} />
                                            </button>

                                            {isDigitalServiceOpen && (
                                                <div className="absolute left-0 top-full z-[1200] mt-2 w-[360px] rounded-md border border-gray-200 bg-white shadow-2xl">
                                                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-[13px] font-semibold text-gray-800">
                                                        Digital service Tracking
                                                        <button
                                                            type="button"
                                                            className="text-gray-400 hover:text-gray-600"
                                                            onClick={() => setIsDigitalServiceOpen(false)}
                                                            aria-label="Close"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="px-4 py-3 text-[12px] text-gray-600">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <div className="font-medium text-gray-800">
                                                                    Track VAT MOSS, OSS, IOSS, or sale of digital services for this customer
                                                                </div>
                                                                <div className="text-gray-500">
                                                                    Enable this option if this is an overseas customer or they are in an EU member state
                                                                    so that you can record and track VAT MOSS, OSS, IOSS, or digital services export using reports.
                                                                </div>
                                                            </div>
                                                            <label className="inline-flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={digitalServiceEnabled}
                                                                    onChange={(e) => setDigitalServiceEnabled(e.target.checked)}
                                                                    className="sr-only"
                                                                />
                                                                <span
                                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                                        digitalServiceEnabled ? "bg-blue-500" : "bg-gray-300"
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                                                            digitalServiceEnabled ? "translate-x-5" : "translate-x-1"
                                                                        }`}
                                                                    />
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsDigitalServiceOpen(false)}
                                                            className="rounded bg-[#22b573] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1ea465]"
                                                        >
                                                            Update
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsDigitalServiceOpen(false)}
                                                            className="rounded border border-gray-300 px-4 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Unpaid Invoices Widget */}
                            {formData.customerId && (
                                <div className="w-64 bg-[#334155] rounded-sm p-3 flex items-center justify-between text-white shadow-sm shrink-0 self-start mt-1">
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-bold text-slate-300 uppercase truncate">
                                            {formData.customerName ? `${formData.customerName}'s De...` : "Select a customer"}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle size={14} className="text-orange-400" />
                                            <span className="text-[12px]">1 Unpaid Invoices</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" />
                                </div>
                            )}
                        </div>

                        <div className={!formData.customerId ? "opacity-30 pointer-events-none transition-all duration-500" : "transition-all duration-500"}>
                            {/* Subscription For Toggle */}
                            <div className="flex items-center gap-8 border-t border-gray-100 pt-8">
                                <label className="text-[13px] font-normal text-gray-600 w-36 shrink-0">Create Subscription For</label>
                                <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => handleChange("contentType", "product")}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[13px] transition-all ${formData.contentType === "product" ? "bg-white text-blue-600 shadow-sm border border-blue-500" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border-2 ${formData.contentType === "product" ? "bg-blue-600 border-blue-600 ring-2 ring-blue-100" : "border-gray-300"}`} />
                                        Product (Plan & Addons)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChange("contentType", "items")}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[13px] transition-all ${formData.contentType === "items" ? "bg-white text-blue-600 shadow-sm border border-blue-500" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border-2 ${formData.contentType === "items" ? "bg-blue-600 border-blue-600 ring-2 ring-blue-100" : "border-gray-300"}`} />
                                        Items
                                    </button>
                                </div>
                            </div>



                            {formData.contentType === "product" ? (
                                <div className="space-y-4 pt-4">
                                    {/* Plan Section */}
                                    <div className="flex items-center gap-8">
                                        <label className="text-[13px] font-normal text-[#d9534f] w-36 shrink-0">Product*</label>
                                        <div className="relative w-[460px]" ref={productDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsProductDropdownOpen((prev) => !prev)}
                                                className={`w-full px-3 py-1.5 border border-[#3b82f6] rounded text-[13px] outline-none text-left bg-white flex items-center justify-between ${selectedProductName ? "text-gray-800" : "text-gray-400"}`}
                                            >
                                                <span>{selectedProductName || "Select Product"}</span>
                                                <ChevronDown size={14} className="text-gray-400" />
                                            </button>
                                            {isProductDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[200] overflow-hidden">
                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            className="w-full bg-transparent border-none outline-none text-[13px] py-1"
                                                            value={productSearch}
                                                            onChange={(e) => setProductSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="max-h-[260px] overflow-y-auto">
                                                        {filteredProducts.length === 0 ? (
                                                            <div className="p-3 text-[12px] text-gray-400 text-center">No active products found</div>
                                                        ) : (
                                                            filteredProducts.map((product) => (
                                                                <button
                                                                    key={product.id}
                                                                    type="button"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => handleProductSelect(product)}
                                                                    className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-blue-600 hover:text-white border-b border-gray-50 last:border-0"
                                                                >
                                                                    {product.name}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/products/products/new")}
                                                        className="w-full p-2.5 text-blue-600 text-[13px] font-medium border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2 justify-center"
                                                    >
                                                        <Plus size={14} /> New Product
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`${!formData.productId ? "opacity-30 pointer-events-none" : ""}`}>
                                        <div className="border-y border-gray-200 py-3">
                                        <div className="flex items-center gap-4 text-[13px] text-slate-600">
                                            <div className="relative w-44">
                                                <select
                                                    className="w-full pl-3 pr-7 py-1.5 bg-transparent text-[13px] outline-none appearance-none"
                                                    value={formData.taxPreference}
                                                    onChange={(e) => handleChange("taxPreference", e.target.value)}
                                                >
                                                    <option>Tax Exclusive</option>
                                                    <option>Tax Inclusive</option>
                                                </select>
                                                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                            <div className="h-6 w-px bg-gray-200" />
                                            <div className="relative w-56">
                                                <select
                                                    className="w-full pl-3 pr-7 py-1.5 bg-transparent text-[13px] text-slate-700 outline-none appearance-none"
                                                    value={formData.priceListId}
                                                    onChange={(e) => {
                                                        const nextId = e.target.value;
                                                        const nextList = priceLists.find((pl) => String(pl.id) === String(nextId));
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            priceListId: nextId,
                                                            priceListName: nextList?.name || "Select Price List",
                                                        }));
                                                    }}
                                                >
                                                    <option value="">Select Price List</option>
                                                    {priceLists.map((pl) => (
                                                        <option key={pl.id} value={pl.id}>
                                                            {pl.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <table className="w-full border-collapse border-x border-b border-gray-200">
                                        <thead className="bg-white">
                                            <tr className="text-[12px] font-semibold text-gray-800 uppercase tracking-wide text-left">
                                                <th className="px-4 py-2.5 border-b border-gray-200 w-[45%]">PLAN NAME</th>
                                                <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[13%] text-right">QUANTITY</th>
                                                <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[15%] text-right">PRICE</th>
                                                <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[15%]">TAX</th>
                                                <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[10%] text-right">AMOUNT</th>
                                                <th className="px-2 py-2.5 border-b border-l border-gray-200 w-[2%]" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="text-[13px]">
                                                <td className="px-3 py-2 border-b border-gray-100 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-7 w-7 rounded border border-gray-300 bg-gray-50" />
                                                        <div className="relative flex-1" ref={planAddonDropdownRef}>
                                                            <button
                                                                type="button"
                                                                disabled={!selectedProductName}
                                                                onClick={() => setIsPlanAddonDropdownOpen((prev) => !prev)}
                                                                className={`w-full py-1 text-left outline-none bg-transparent flex items-center justify-between ${formData.planName === "Select a Plan" ? "text-gray-400" : "text-gray-700"} ${!selectedProductName ? "cursor-not-allowed opacity-60" : ""}`}
                                                            >
                                                                <span>{formData.planName || "Type or click to select a plan."}</span>
                                                                <ChevronDown size={14} className="text-gray-400" />
                                                            </button>
                                                            {isPlanAddonDropdownOpen && selectedProductName && (
                                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[200] overflow-hidden">
                                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                                        <input
                                                                            autoFocus
                                                                            type="text"
                                                                            placeholder="Search"
                                                                            className="w-full bg-transparent border-none outline-none text-[13px] py-1"
                                                                            value={planAddonSearch}
                                                                            onChange={(e) => setPlanAddonSearch(e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="max-h-[260px] overflow-y-auto">
                                                                        {availablePlanAddons.length === 0 ? (
                                                                            <div className="p-3 text-[12px] text-gray-400 text-center">No plans/addons for selected product</div>
                                                                        ) : (
                                                                            availablePlanAddons.map((row) => (
                                                                                <button
                                                                                    key={row.id}
                                                                                    type="button"
                                                                                    onClick={() => handlePlanAddonSelect(row)}
                                                                                    className="w-full text-left px-3 py-2.5 hover:bg-blue-600 hover:text-white border-b border-gray-50 last:border-0"
                                                                                >
                                                                                    <div className="text-[13px] font-medium">{row.name}</div>
                                                                                    <div className="text-[12px] opacity-70">{row.type === "plan" ? "Code" : "Addon Code"}: {row.code || "-"}</div>
                                                                                </button>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate("/products/plans/new")}
                                                                        className="w-full p-2.5 text-blue-600 text-[13px] font-medium border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2 justify-center"
                                                                    >
                                                                        <Plus size={14} /> Add New Item
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {formData.planName && formData.planName !== "Select a Plan" && (
                                                                <textarea
                                                                    placeholder="Add Description here"
                                                                    value={formData.planDescription}
                                                                    onChange={(e) => handleChange("planDescription", e.target.value)}
                                                                    className="mt-2 w-full px-2 py-1 text-[12px] text-gray-500 border border-gray-300 rounded bg-transparent resize-none h-16 outline-none focus:border-blue-500"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 border-b border-l border-gray-100 align-middle">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent text-right outline-none text-[13px] text-slate-800"
                                                        value={formData.quantity}
                                                        onChange={(e) => handleChange("quantity", parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-b border-l border-gray-100 align-middle">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent text-right outline-none text-[13px] text-slate-800"
                                                        value={formData.price}
                                                        onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-b border-l border-gray-100 align-middle">
                                                    <div className="relative">
                                                        <select
                                                            className="w-full bg-transparent text-[13px] text-slate-600 outline-none appearance-none"
                                                            value={formData.tax}
                                                            onChange={(e) => handleChange("tax", e.target.value)}
                                                        >
                                                            <option>Select a Tax</option>
                                                            {taxes.map((tax) => (
                                                                <option key={tax.id || (tax as any)._id || tax.name} value={tax.name}>
                                                                    {tax.name} {Number.isFinite(tax.rate) ? `(${tax.rate}%)` : ""}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 border-b border-l border-gray-100 text-right text-[13px] text-slate-900 font-semibold">
                                                    {(formData.quantity * formData.price).toFixed(2)}
                                                </td>
                                                <td className="px-2 py-2 border-b border-l border-gray-100 text-center">
                                                    <MoreVertical size={16} className="mx-auto text-blue-600" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colSpan={6} className="px-3 py-2 text-[13px] text-slate-600 border-b border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-500">Reporting Tags:</span>
                                                        <div className="relative" ref={reportingTagDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsReportingTagDropdownOpen(!isReportingTagDropdownOpen)}
                                                                className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-all"
                                                            >
                                                                <span className={formData.tag ? "text-blue-600" : "text-gray-400"}>
                                                                    {formData.tag || "Select Tag"}
                                                                </span>
                                                                <ChevronDown size={12} className="text-gray-400" />
                                                            </button>
                                                            {isReportingTagDropdownOpen && (
                                                                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[210]">
                                                                    <div className="p-2 border-b border-gray-50">
                                                                        <input
                                                                            type="text"
                                                                            className="w-full px-2 py-1 text-[12px] bg-gray-50 border border-transparent focus:border-blue-500 rounded outline-none"
                                                                            placeholder="Search tags"
                                                                            value={reportingTagSearch}
                                                                            onChange={(e) => setReportingTagSearch(e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="max-h-[160px] overflow-y-auto py-1">
                                                                        {reportingTags.filter(t => t.name.toLowerCase().includes(reportingTagSearch.toLowerCase())).map(tag => (
                                                                            <button
                                                                                key={tag.id}
                                                                                onClick={() => {
                                                                                    handleChange("tag", tag.name);
                                                                                    setIsReportingTagDropdownOpen(false);
                                                                                }}
                                                                                className="w-full text-left px-4 py-1.5 hover:bg-gray-50 text-[12px] flex items-center justify-between"
                                                                            >
                                                                                <span>{tag.name}</span>
                                                                                {formData.tag === tag.name && <Check size={12} className="text-blue-600" />}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {formData.planName && formData.planName !== "Select a Plan" && availableAddons.length > 0 && (
                                        <div className="space-y-3 pt-4">
                                            <div className="text-[14px] text-slate-600">
                                                Addons ({availableAddons.length} associated to {formData.planName})
                                            </div>
                                            <table className="w-full border-collapse border-x border-b border-gray-200">
                                            <thead className="bg-white">
                                                <tr className="text-[12px] font-semibold text-gray-800 uppercase tracking-wide text-left">
                                                    <th className="px-4 py-2.5 border-b border-gray-200 w-[45%]">ADDON NAME</th>
                                                    <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[13%] text-right">QUANTITY</th>
                                                    <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[15%] text-right">PRICE</th>
                                                    <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[15%]">TAX</th>
                                                    <th className="px-4 py-2.5 border-b border-l border-gray-200 w-[10%] text-right">AMOUNT</th>
                                                    <th className="px-2 py-2.5 border-b border-l border-gray-200 w-[2%]" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {addonLines.map((line) => (
                                                    <tr key={line.id} className="text-[13px]">
                                                        <td className="px-3 py-2 border-b border-gray-100 align-middle">
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOpenItemDropdowns((prev) => ({ ...prev, [line.id]: !prev[line.id] }))}
                                                                    className={`w-full py-1 text-left outline-none bg-transparent flex items-center justify-between ${line.addonName ? "text-gray-700" : "text-gray-400"}`}
                                                                >
                                                                    <span>{line.addonName || "Select an Addon"}</span>
                                                                    <ChevronDown size={14} className="text-gray-400" />
                                                                </button>
                                                                {openItemDropdowns[line.id] && (
                                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[200] overflow-hidden">
                                                                        <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                                            <Search size={14} className="text-gray-400 ml-1" />
                                                                            <input
                                                                                autoFocus
                                                                                type="text"
                                                                                placeholder="Search"
                                                                                className="w-full bg-transparent border-none outline-none text-[13px] py-1"
                                                                                value={itemSearches[line.id] || ""}
                                                                                onChange={(e) => setItemSearches((prev) => ({ ...prev, [line.id]: e.target.value }))}
                                                                            />
                                                                        </div>
                                                                        <div className="max-h-[260px] overflow-y-auto">
                                                                            {availableAddons
                                                                                .filter((row) =>
                                                                                    String(row.name || "")
                                                                                        .toLowerCase()
                                                                                        .includes(String(itemSearches[line.id] || "").toLowerCase())
                                                                                )
                                                                                .map((row) => (
                                                                                    <button
                                                                                        key={row.id}
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            handleAddonSelect(line.id, row);
                                                                                            setOpenItemDropdowns((prev) => ({ ...prev, [line.id]: false }));
                                                                                        }}
                                                                                        className="w-full text-left px-3 py-2.5 hover:bg-blue-600 hover:text-white border-b border-gray-50 last:border-0"
                                                                                    >
                                                                                        <div className="text-[13px] font-medium">{row.name}</div>
                                                                                        <div className="text-[12px] opacity-70">Addon Code: {row.code || "-"}</div>
                                                                                    </button>
                                                                                ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {line.addonName && (
                                                                <textarea
                                                                    placeholder="Add Description here"
                                                                    value={line.description}
                                                                    onChange={(e) =>
                                                                        setAddonLines((prev) =>
                                                                            prev.map((l) => (l.id === line.id ? { ...l, description: e.target.value } : l))
                                                                        )
                                                                    }
                                                                    className="mt-2 w-full px-2 py-1 text-[12px] text-gray-500 border border-gray-300 rounded bg-transparent resize-none h-16 outline-none focus:border-blue-500"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 border-b border-l border-gray-100 align-middle">
                                                            <input
                                                                type="number"
                                                                className="w-full bg-transparent text-right outline-none text-[13px] text-slate-800"
                                                                value={line.quantity}
                                                                onChange={(e) =>
                                                                    setAddonLines((prev) =>
                                                                        prev.map((l) => {
                                                                            if (l.id !== line.id) return l;
                                                                            const quantity = Number(e.target.value) || 0;
                                                                            const amount = quantity * l.rate + (quantity * l.rate * (Number(l.taxRate) || 0)) / 100;
                                                                            return { ...l, quantity, amount };
                                                                        })
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 border-b border-l border-gray-100 align-middle text-right">
                                                            {Number(line.rate || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 border-b border-l border-gray-100 align-middle">
                                                            <select
                                                                className="w-full bg-transparent text-[13px] text-slate-600 outline-none appearance-none"
                                                                value={line.tax}
                                                                onChange={(e) =>
                                                                    setAddonLines((prev) =>
                                                                        prev.map((l) => {
                                                                            if (l.id !== line.id) return l;
                                                                            const taxName = e.target.value;
                                                                            const taxRow = taxes.find((t) => t.name === taxName);
                                                                            const taxRate = taxRow ? Number(taxRow.rate) : 0;
                                                                            const amount = (Number(l.quantity) || 0) * l.rate + ((Number(l.quantity) || 0) * l.rate * taxRate) / 100;
                                                                            return { ...l, tax: taxName, taxRate, amount };
                                                                        })
                                                                    )
                                                                }
                                                            >
                                                                <option>Select a Tax</option>
                                                                {taxes.map((tax) => (
                                                                    <option key={tax.id || (tax as any)._id || tax.name} value={tax.name}>
                                                                        {tax.name} {Number.isFinite(tax.rate) ? `(${tax.rate}%)` : ""}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2 border-b border-l border-gray-100 text-right text-[13px] text-slate-900 font-semibold">
                                                            {Number(line.amount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-2 py-2 border-b border-l border-gray-100 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setAddonLines((prev) => prev.filter((l) => l.id !== line.id))}
                                                                className="text-red-500"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            </table>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAddonLines((prev) => [
                                                        ...prev,
                                                        { id: Math.max(0, ...prev.map((l) => l.id)) + 1, addonName: "", description: "", quantity: 1, rate: 0, baseRate: 0, tax: "Select a Tax", taxRate: 0, amount: 0 },
                                                    ])
                                                }
                                                className="text-blue-600 text-[12px] font-medium"
                                            >
                                                + Associate Another Addon
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Item Table Section */}
                                    <div className="border-y border-gray-200 py-3">
                                        <div className="flex items-center gap-3 text-[13px] text-slate-600">
                                            <FileText size={14} className="text-gray-400" />
                                            <div className="relative w-56">
                                                <select
                                                    className="w-full pl-1 pr-6 py-1.5 bg-transparent text-[13px] text-slate-700 outline-none appearance-none"
                                                    value={formData.priceListId}
                                                    onChange={(e) => {
                                                        const nextId = e.target.value;
                                                        const nextList = priceLists.find((pl) => String(pl.id) === String(nextId));
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            priceListId: nextId,
                                                            priceListName: nextList?.name || "Select Price List",
                                                        }));
                                                    }}
                                                >
                                                    <option value="">Select Price List</option>
                                                    {priceLists.map((pl) => (
                                                        <option key={pl.id} value={pl.id}>
                                                            {pl.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={13} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-md overflow-visible">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-[#f8f9fb] rounded-t-md">
                                            <h2 className="text-[13px] font-semibold text-gray-800">Item Table</h2>
                                            <div className="relative" ref={bulkActionsRef}>
                                                <button
                                                    onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                                                    className="flex items-center gap-1 text-[#156372] hover:text-[#0D4A52] text-[13px] font-medium"
                                                >
                                                    <CheckCircle size={14} />
                                                    <span>Bulk Actions</span>
                                                </button>
                                                {isBulkActionsOpen && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[200] min-w-[200px] py-1">
                                                        <button className="w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50">Show All Additional Information</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-white border-b border-gray-200">
                                                    <th className="text-left py-2.5 px-4 text-[11px] font-bold text-gray-500 uppercase">Item Details</th>
                                                    <th className="text-center py-2.5 px-4 text-[11px] font-bold text-gray-500 uppercase w-24">Quantity</th>
                                                    <th className="text-center py-2.5 px-4 text-[11px] font-bold text-gray-500 uppercase w-32">Price</th>
                                                    <th className="text-left py-2.5 px-4 text-[11px] font-bold text-gray-500 uppercase w-48">Tax</th>
                                                    <th className="text-right py-2.5 px-4 text-[11px] font-bold text-gray-500 uppercase w-32">Amount</th>
                                                    <th className="w-16"></th>
                                                </tr>

                                            </thead>
                                            <tbody>
                                                {formData.items.map((item) => (
                                                    <React.Fragment key={item.id}>
                                                        {item.isHeader ? (
                                                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                                                <td colSpan={6} className="px-4 py-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <input
                                                                            type="text"
                                                                            value={item.headerText || ""}
                                                                            onChange={(e) => handleItemChange(item.id, "headerText", e.target.value)}
                                                                            placeholder="Header name"
                                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-[13px] text-slate-700 outline-none bg-white"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveItem(item.id)}
                                                                            className="text-red-500"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                        <>
                                                        <tr className="border-b border-gray-200 hover:bg-gray-50/30 group">
                                                        <td className="py-3 px-4">
                                                            <div className="flex gap-3">
                                                                <div className="pt-2 text-gray-300">
                                                                    <GripVertical size={14} />
                                                                </div>
                                                                <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                                                                    {item.imageUrl ? (
                                                                        <img src={item.imageUrl} alt={item.itemDetails || "Item"} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <ImageIcon size={18} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="relative" ref={(el) => { itemDropdownRefs.current[String(item.id)] = el; }}>
                                                                        <input
                                                                            type="text"
                                                                            value={item.itemDetails}
                                                                            onChange={(e) => {
                                                                                handleItemChange(item.id, 'itemDetails', e.target.value);
                                                                                setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }));
                                                                                setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                                                            }}
                                                                            onFocus={() => {
                                                                                setItemSearches(prev => ({ ...prev, [item.id]: "" }));
                                                                                setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                                                            }}
                                                                            onClick={() => {
                                                                                setItemSearches(prev => ({ ...prev, [item.id]: "" }));
                                                                                setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                                                            }}
                                                                            placeholder="Type or click to select an item."
                                                                            className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none text-[13px] transition-all bg-transparent"
                                                                        />
                                                                        {openItemDropdowns[item.id] && (
                                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-2xl z-[210] max-h-[300px] overflow-y-auto">
                                                                                {filteredItemOptions(itemSearches[item.id]).length === 0 ? (
                                                                                    <div className="p-4 text-center text-[12px] text-gray-400 italic">No items found</div>
                                                                                ) : (
                                                                                    filteredItemOptions(itemSearches[item.id]).map(opt => (
                                                                                        <button
                                                                                            key={opt.id}
                                                                                            onClick={() => handleSelectItem(item.id, opt)}
                                                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                                                                        >
                                                                                            <div className="text-[13px] font-medium text-gray-800">{getItemDisplayName(opt)}</div>
                                                                                            <div className="text-[11px] text-gray-400">Rate: {getItemRate(opt)} {formData.currency}</div>
                                                                                        </button>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {item.sku && (
                                                                        <div className="text-[11px] text-gray-400">SKU: {item.sku}</div>
                                                                    )}
                                                                    <textarea
                                                                        placeholder="Add a description for your item"
                                                                        value={item.description}
                                                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                                        className="w-full px-2 py-1 text-[12px] text-gray-500 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent resize-none h-8 outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <input
                                                                type="text"
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none text-[13px] text-center bg-transparent transition-all"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <input
                                                                type="text"
                                                                value={item.rate}
                                                                onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none text-[13px] text-center bg-transparent transition-all"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 align-top">
                                                            <div className="relative" ref={(el) => { taxDropdownRefs.current[String(item.id)] = el; }}>
                                                                <button
                                                                    onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                                    className={`w-full px-3 py-1.5 border border-gray-200 hover:border-gray-300 rounded text-[13px] text-left flex items-center justify-between transition-all bg-white ${item.tax === "Select a Tax" ? "text-gray-400 font-normal" : "text-gray-800 font-medium"}`}
                                                                >
                                                                    <span className="truncate">{item.tax}</span>
                                                                    <ChevronDown size={14} className="text-gray-400 shrink-0" />
                                                                </button>
                                                                {openTaxDropdowns[item.id] && (
                                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-2xl z-[210] max-h-[200px] overflow-y-auto">
                                                                        <div className="p-2 border-b border-gray-50">
                                                                            <div className="relative">
                                                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                                <input
                                                                                    type="text"
                                                                                    className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-gray-50 rounded outline-none"
                                                                                    placeholder="Search"
                                                                                    value={taxSearches[item.id] || ""}
                                                                                    onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="py-1 uppercase text-[10px] font-bold text-gray-400 px-4 mb-1">Taxes</div>
                                                                        {taxes.filter(t => t.name.toLowerCase().includes((taxSearches[item.id] || "").toLowerCase())).map(tax => (
                                                                            <button
                                                                                key={tax.id}
                                                                                onClick={() => handleSelectTax(item.id, tax)}
                                                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] flex items-center justify-between"
                                                                            >
                                                                                <span>{tax.name}</span>
                                                                                <span className="text-gray-400 text-[11px]">{tax.rate}%</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 align-top text-right text-[13px] font-semibold text-gray-800 pt-5">
                                                            {item.amount.toFixed(2)}
                                                        </td>
                                                        <td className="py-3 px-2 align-top pt-4">
                                                            <div className="flex items-center justify-end gap-2 opacity-100">
                                                                <div className="relative" ref={(el) => { itemMenuRefs.current[String(item.id)] = el; }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setOpenItemMenus((prev) => ({
                                                                                [item.id]: !prev[item.id],
                                                                            }))
                                                                        }
                                                                        className="text-gray-400 hover:text-gray-600"
                                                                    >
                                                                        <MoreVertical size={16} />
                                                                    </button>
                                                                    {openItemMenus[item.id] && (
                                                                        <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-[300] py-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleToggleAdditionalInfo(item.id);
                                                                                    setOpenItemMenus({});
                                                                                }}
                                                                                className="w-full text-left px-4 py-2 text-[12px] text-slate-700 hover:bg-gray-50"
                                                                            >
                                                                                {item.showAdditional ? "Hide Additional Information" : "Show Additional Information"}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleCloneItemRow(item.id);
                                                                                    setOpenItemMenus({});
                                                                                }}
                                                                                className="w-full text-left px-4 py-2 text-[12px] text-slate-700 hover:bg-gray-50"
                                                                            >
                                                                                Clone
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleInsertNewRow(item.id);
                                                                                    setOpenItemMenus({});
                                                                                }}
                                                                                className="w-full text-left px-4 py-2 text-[12px] text-slate-700 hover:bg-gray-50"
                                                                            >
                                                                                Insert New Row
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setIsBulkItemsModalOpen(true);
                                                                                    setOpenItemMenus({});
                                                                                }}
                                                                                className="w-full text-left px-4 py-2 text-[12px] text-slate-700 hover:bg-gray-50"
                                                                            >
                                                                                Insert Items in Bulk
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleInsertHeaderRow(item.id);
                                                                                    setOpenItemMenus({});
                                                                                }}
                                                                                className="w-full text-left px-4 py-2 text-[12px] text-slate-700 hover:bg-gray-50"
                                                                            >
                                                                                Insert New Header
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveItem(item.id)}
                                                                    className="text-red-500"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        </tr>
                                                        {item.showAdditional !== false && (
                                                        <tr className="bg-white">
                                                            <td colSpan={6} className="px-4 py-2 border-b border-gray-200 text-[12px] text-slate-600">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="relative w-56" ref={(el) => { accountDropdownRefs.current[String(item.id)] = el; }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setOpenAccountDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-left flex items-center justify-between text-[12px] bg-white hover:border-gray-300"
                                                                        >
                                                                            <span className={item.account ? "text-gray-700" : "text-gray-400"}>
                                                                                {item.account || "Select an account"}
                                                                            </span>
                                                                            <ChevronDown size={12} className="text-gray-400" />
                                                                        </button>
                                                                        {openAccountDropdowns[item.id] && (
                                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[220]">
                                                                                <div className="p-2 border-b border-gray-50">
                                                                                    <div className="relative">
                                                                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                                        <input
                                                                                            type="text"
                                                                                            className="w-full pl-7 pr-2 py-1 text-[12px] bg-gray-50 border border-transparent focus:border-blue-500 rounded outline-none"
                                                                                            placeholder="Search accounts"
                                                                                            value={accountSearches[item.id] || ""}
                                                                                            onChange={(e) => setAccountSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            <div className="max-h-[160px] overflow-y-auto py-1">
                                                                                {(accountSearches[item.id] || "").trim() ? (
                                                                                    ACCOUNT_OPTIONS.filter(acc => acc.toLowerCase().includes((accountSearches[item.id] || "").toLowerCase())).map(acc => (
                                                                                        <button
                                                                                            key={acc}
                                                                                            onClick={() => {
                                                                                                handleItemChange(item.id, "account", acc);
                                                                                                setOpenAccountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                                                            }}
                                                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[12px]"
                                                                                        >
                                                                                            {acc}
                                                                                        </button>
                                                                                    ))
                                                                                ) : (
                                                                                    ACCOUNT_GROUPS.map((group) => (
                                                                                        <div key={group.title}>
                                                                                            <div className="px-4 py-2 text-[12px] font-semibold text-slate-800">
                                                                                                {group.title}
                                                                                            </div>
                                                                                            {group.items.map((acc) => (
                                                                                                <button
                                                                                                    key={`${group.title}-${acc}`}
                                                                                                    onClick={() => {
                                                                                                        handleItemChange(item.id, "account", acc);
                                                                                                        setOpenAccountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                                                                    }}
                                                                                                    className="w-full text-left px-6 py-2 hover:bg-gray-50 text-[12px]"
                                                                                                >
                                                                                                    {acc}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                                {(accountSearches[item.id] || "").trim() && ACCOUNT_OPTIONS.filter(acc => acc.toLowerCase().includes((accountSearches[item.id] || "").toLowerCase())).length === 0 && (
                                                                                    <div className="px-4 py-2 text-[12px] text-gray-400 italic">No accounts found</div>
                                                                                )}
                                                                            </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="h-4 w-px bg-gray-200" />
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-gray-500">Reporting Tags:</span>
                                                                        <div className="relative" ref={(el) => { itemTagDropdownRefs.current[String(item.id)] = el; }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setOpenItemTagDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                                                className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-all text-[12px]"
                                                                            >
                                                                                <span className={item.reportingTag ? "text-blue-600" : "text-gray-400"}>
                                                                                    {item.reportingTag || "Select Tag"}
                                                                                </span>
                                                                                <ChevronDown size={12} className="text-gray-400" />
                                                                            </button>
                                                                            {openItemTagDropdowns[item.id] && (
                                                                                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-[220]">
                                                                                    <div className="p-2 border-b border-gray-50">
                                                                                        <input
                                                                                            type="text"
                                                                                            className="w-full px-2 py-1 text-[12px] bg-gray-50 border border-transparent focus:border-blue-500 rounded outline-none"
                                                                                            placeholder="Search tags"
                                                                                            value={itemTagSearches[item.id] || ""}
                                                                                            onChange={(e) => setItemTagSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="max-h-[160px] overflow-y-auto py-1">
                                                                                        {reportingTags.filter(t => t.name.toLowerCase().includes((itemTagSearches[item.id] || "").toLowerCase())).length === 0 ? (
                                                                                            <div className="px-4 py-2 text-[12px] text-gray-400 italic">No tags found</div>
                                                                                        ) : (
                                                                                            reportingTags.filter(t => t.name.toLowerCase().includes((itemTagSearches[item.id] || "").toLowerCase())).map(tag => (
                                                                                                <button
                                                                                                    key={tag.id}
                                                                                                    onClick={() => {
                                                                                                        handleItemChange(item.id, "reportingTag", tag.name);
                                                                                                        setOpenItemTagDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                                                                    }}
                                                                                                    className="w-full text-left px-4 py-1.5 hover:bg-gray-50 text-[12px] flex items-center justify-between"
                                                                                                >
                                                                                                    <span>{tag.name}</span>
                                                                                                    {item.reportingTag === tag.name && <Check size={12} className="text-blue-600" />}
                                                                                                </button>
                                                                                            ))
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        )}
                                                        </>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center">
                                            <button
                                                onClick={handleAddItem}
                                                className="flex items-center gap-2 px-4 py-2 bg-[#eef3ff] border border-[#d7deef] text-[#1f3f79] rounded-md text-[13px] font-medium hover:bg-[#e7eefb] transition-colors"
                                            >
                                                <Plus size={16} className="text-blue-600" /> Add New Row
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsBulkItemsModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#eef3ff] border border-[#d7deef] text-[#1f3f79] rounded-md text-[13px] font-medium hover:bg-[#e7eefb] transition-colors"
                                        >
                                            <Plus size={16} className="text-blue-600" /> Add Items in Bulk
                                        </button>
                                    </div>


                                    {/* Bulk Items Modal */}
                                    {isBulkItemsModalOpen && (
                                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[500] backdrop-blur-sm">
                                            <div className="bg-white rounded-lg shadow-2xl w-[900px] h-[520px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                                                    <h3 className="text-[16px] font-semibold text-slate-800">Add Items in Bulk</h3>
                                                    <button onClick={() => setIsBulkItemsModalOpen(false)} className="text-red-500 hover:text-red-600 transition-colors">
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className="flex flex-1 min-h-0">
                                                    <div className="w-[360px] border-r border-gray-100 flex flex-col">
                                                        <div className="px-4 py-3 border-b border-gray-50 bg-white">
                                                            <input
                                                                type="text"
                                                                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-[12px] outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                placeholder="Type to search or scan the barcode of the item"
                                                                value={bulkItemSearch}
                                                                onChange={(e) => setBulkItemSearch(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto">
                                                            {availableItems
                                                                .filter(item =>
                                                                    getItemDisplayName(item).toLowerCase().includes(bulkItemSearch.toLowerCase()) ||
                                                                    getItemSku(item).toLowerCase().includes(bulkItemSearch.toLowerCase())
                                                                )
                                                                .map(item => {
                                                                    const id = String(item.id || item._id);
                                                                    const isSelected = selectedBulkItems.includes(id);
                                                                    return (
                                                                        <button
                                                                            key={id}
                                                                            onClick={() => {
                                                                                setSelectedBulkItems(prev => {
                                                                                    const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
                                                                                    return next;
                                                                                });
                                                                                setBulkItemQuantities(prev => ({
                                                                                    ...prev,
                                                                                    [id]: Math.max(1, Number(prev[id] || 1)),
                                                                                }));
                                                                            }}
                                                                            className={`group w-full text-left px-4 py-3 border-b border-gray-50 flex items-start justify-between transition-colors ${isSelected ? "bg-slate-50 ring-1 ring-blue-200" : "hover:bg-blue-50"}`}
                                                                        >
                                                                            <div className="min-w-0">
                                                                                <div className={`text-[12px] font-semibold truncate ${isSelected ? "text-slate-800" : "text-slate-800 group-hover:text-blue-600"}`}>
                                                                                    {getItemDisplayName(item)}
                                                                                </div>
                                                                                <div className="text-[11px] text-gray-500">SKU: {getItemSku(item) || "-" } · Rate: {formData.currency} {getItemRate(item).toFixed(2)}</div>
                                                                            </div>
                                                                            <div className={`mt-1 h-5 w-5 rounded-full border flex items-center justify-center ${isSelected ? "bg-green-500 border-green-500 text-white" : "border-gray-300 text-gray-300"}`}>
                                                                                <Check size={12} />
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 flex flex-col">
                                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-700">
                                                                Selected Items
                                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full border border-gray-300 text-[12px] font-semibold">
                                                                    {selectedBulkItems.length}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-gray-500">
                                                                Total Quantity: {selectedBulkItems.reduce((sum, id) => sum + (bulkItemQuantities[id] || 1), 0)}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 overflow-y-auto">
                                                            {selectedBulkItems.length === 0 ? (
                                                                <div className="h-full flex items-center justify-center text-[12px] text-gray-500">
                                                                    Click the item names from the left pane to select them
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 space-y-3">
                                                                    {selectedBulkItems.map((id, index) => {
                                                                        const item = availableItems.find(i => String(i.id || i._id) === id);
                                                                        if (!item) return null;
                                                                        const qty = Math.max(1, Number(bulkItemQuantities[id] || 1));
                                                                        return (
                                                                            <div key={id} className="flex items-center justify-between gap-3 group">
                                                                                <div className="text-[12px] text-slate-700">
                                                                                    [{index + 1}] {getItemDisplayName(item)}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="flex items-center gap-1 rounded-md border border-blue-400 px-1 py-0.5">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setBulkItemQuantities(prev => ({
                                                                                                    ...prev,
                                                                                                    [id]: Math.max(1, (prev[id] || 1) - 1),
                                                                                                }))
                                                                                            }
                                                                                            className="h-6 w-6 rounded-full bg-blue-500 text-white text-[12px] leading-none hover:bg-blue-600"
                                                                                        >
                                                                                            -
                                                                                        </button>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={qty}
                                                                                            onChange={(e) => {
                                                                                                const next = Math.max(1, Number(e.target.value) || 1);
                                                                                                setBulkItemQuantities(prev => ({ ...prev, [id]: next }));
                                                                                            }}
                                                                                            className="w-8 text-center text-[12px] text-blue-700 outline-none"
                                                                                            aria-label={`Quantity of ${getItemDisplayName(item)}`}
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setBulkItemQuantities(prev => ({
                                                                                                    ...prev,
                                                                                                    [id]: (prev[id] || 1) + 1,
                                                                                                }))
                                                                                            }
                                                                                            className="h-6 w-6 rounded-full bg-blue-500 text-white text-[12px] leading-none hover:bg-blue-600"
                                                                                        >
                                                                                            +
                                                                                        </button>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setSelectedBulkItems(prev => prev.filter(x => x !== id));
                                                                                            setBulkItemQuantities(prev => {
                                                                                                const next = { ...prev };
                                                                                                delete next[id];
                                                                                                return next;
                                                                                            });
                                                                                        }}
                                                                                        className="h-6 w-6 rounded-full border border-red-300 text-red-500 hover:bg-red-50"
                                                                                        aria-label="Remove selected item"
                                                                                    >
                                                                                        <X size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-3 bg-white">
                                                    <button
                                                        onClick={handleAddBulkItems}
                                                        disabled={selectedBulkItems.length === 0}
                                                        className={`px-4 py-1.5 rounded-md text-[12px] font-semibold text-white ${selectedBulkItems.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
                                                    >
                                                        Add Items
                                                    </button>
                                                    <button
                                                        onClick={() => setIsBulkItemsModalOpen(false)}
                                                        className="px-4 py-1.5 rounded-md border border-gray-300 text-[12px] text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.contentType !== "items" && (
                            <div className={(formData.contentType === "product" && !formData.productId) ? "opacity-30 pointer-events-none" : ""}>
                            {/* Coupon Section */}
                            <div className="space-y-3">
                                <h3 className="text-[20px] font-normal text-slate-600">Coupon</h3>
                                <table className="w-full border-collapse border-x border-b border-gray-200">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-[12px] font-semibold text-gray-800 uppercase tracking-wide text-left">
                                            <th className="px-4 py-2.5 border-b border-gray-200 w-[45%]">COUPON</th>
                                            <th className="px-4 py-2.5 border-b border-l border-gray-200">COUPON CODE</th>
                                            <th className="px-4 py-2.5 border-b border-l border-gray-200 text-right">VALUE</th>
                                            <th className="border-b border-l border-gray-200 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="text-[13px]">
                                            <td className="border-b border-gray-100 px-4 py-3 relative" ref={couponDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCouponDropdownOpen((prev) => !prev)}
                                                    className={`w-full text-left text-[13px] text-slate-500 flex items-center justify-between gap-2`}
                                                >
                                                    <span>{formData.coupon || "Enter at least 3 characters to search"}</span>
                                                    <ChevronDown size={14} className="text-gray-400" />
                                                </button>
                                                {isCouponDropdownOpen && (
                                                    <div className="absolute left-0 top-full z-[400] mt-1 w-full rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden">
                                                        <div className="border-b border-gray-100 p-2">
                                                            <div className="relative">
                                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-gray-50 rounded outline-none"
                                                                    placeholder="Search"
                                                                    value={couponSearch}
                                                                    onChange={(e) => setCouponSearch(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-[220px] overflow-y-auto">
                                                            {filteredCoupons.length === 0 ? (
                                                                <div className="px-3 py-2 text-[12px] text-slate-500">No active coupons found</div>
                                                            ) : (
                                                                filteredCoupons.map((coupon: CouponOption) => (
                                                                    <button
                                                                        key={coupon.id}
                                                                        type="button"
                                                                        onClick={() => handleCouponSelect(coupon)}
                                                                        className="w-full text-left px-3 py-2.5 hover:bg-blue-600 hover:text-white"
                                                                    >
                                                                        <div className="text-[13px] font-medium">{coupon.couponName}</div>
                                                                        <div className="text-[12px] opacity-80">[{formatCouponValue(coupon)}]</div>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="border-b border-l border-gray-100 px-4 py-3 text-[13px] text-slate-700">{formData.couponCode}</td>
                                            <td className="border-b border-l border-gray-100 px-4 py-3 text-right text-[13px] text-slate-700">{formData.couponValue}</td>
                                            <td className="border-b border-gray-100 px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, coupon: "", couponCode: "", couponValue: "0.00" }))}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            </div>
                            )}

                            {/* Subscription Term Section */}
                            <div className="space-y-6 pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 uppercase tracking-wide">Subscription Term</h3>
                                <div className="space-y-4 max-w-2xl">
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-[#d9534f] w-44 shrink-0">Subscription Number*</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-[#3b82f6] rounded text-[13px] outline-none"
                                            value={formData.subscriptionNumber}
                                            onChange={(e) => handleChange("subscriptionNumber", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-[#d9534f] w-44 shrink-0">Profile Name*</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none"
                                            value={formData.profileName}
                                            onChange={(e) => handleChange("profileName", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-[#d9534f] w-44 shrink-0">Bill Every*</label>
                                        <div className="flex items-center gap-3 w-full">
                                            <input
                                                type="number"
                                                min={1}
                                                className="w-20 px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none text-center"
                                                value={formData.billEveryCount}
                                                onChange={(e) => handleChange("billEveryCount", Math.max(1, Number(e.target.value) || 1))}
                                            />
                                            <div className="relative">
                                                <select
                                                    className="w-32 px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none appearance-none bg-white"
                                                    value={formData.billEveryUnit}
                                                    onChange={(e) => handleChange("billEveryUnit", e.target.value)}
                                                >
                                                    {["Day(s)", "Week(s)", "Month(s)", "Year(s)"].map((unit) => (
                                                        <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none"
                                            value={formData.startDate}
                                            onChange={(e) => handleChange("startDate", e.target.value)}
                                        />
                                    </div>
                                    {(() => {
                                        const today = new Date().toISOString().split("T")[0];
                                        const isBackdated = Boolean(formData.startDate && formData.startDate < today);
                                        if (!isBackdated) return null;
                                        return (
                                            <div className="flex items-center">
                                                <label className="text-[13px] text-gray-600 w-44 shrink-0">Backdated Invoice</label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0"
                                                        checked={Boolean(formData.backdatedGenerateInvoice)}
                                                        onChange={(e) => handleChange("backdatedGenerateInvoice", e.target.checked)}
                                                    />
                                                    <span className="text-[13px] text-gray-600">Create invoice for current billing cycle</span>
                                                </label>
                                            </div>
                                        );
                                    })()}
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Expires After</label>
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="flex-1 flex border border-gray-300 rounded overflow-hidden">
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-1.5 text-[13px] outline-none"
                                                    disabled={formData.neverExpires}
                                                    value={formData.expiresAfter}
                                                    onChange={(e) => handleChange("expiresAfter", e.target.value)}
                                                />
                                                <div className="px-3 bg-gray-50 border-l border-gray-200 flex items-center text-[11px] text-gray-500">cycles</div>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0"
                                                    checked={formData.neverExpires}
                                                    onChange={(e) => handleChange("neverExpires", e.target.checked)}
                                                />
                                                <span className="text-[13px] text-gray-600">Never Expires</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Reference Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none"
                                            value={formData.referenceNumber}
                                            onChange={(e) => handleChange("referenceNumber", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Salesperson</label>
                                        <div className="relative w-full" ref={salespersonDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsSalespersonDropdownOpen((prev) => !prev)}
                                                className={`w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none text-left bg-white flex items-center justify-between ${selectedSalesperson ? "text-gray-800" : "text-gray-400"}`}
                                            >
                                                <span>{selectedSalesperson?.name || (isLoadingSalespersons ? "Loading..." : "Select a salesperson")}</span>
                                                <ChevronDown size={14} className="text-gray-400" />
                                            </button>
                                            {isSalespersonDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[200] overflow-hidden">
                                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                                        <Search size={14} className="text-gray-400 ml-1" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search"
                                                            className="w-full bg-transparent border-none outline-none text-[13px] py-1"
                                                            value={salespersonSearch}
                                                            onChange={(e) => setSalespersonSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="max-h-[220px] overflow-y-auto">
                                                        {filteredSalespersons.length === 0 ? (
                                                            <div className="p-3 text-[12px] text-gray-400 text-center">No active salespersons found</div>
                                                        ) : (
                                                            filteredSalespersons.map((sp) => (
                                                                <button
                                                                    key={String(sp.id || sp._id || sp.name)}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleChange("salesperson", String(sp.id || sp._id || ""));
                                                                        setIsSalespersonDropdownOpen(false);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-blue-600 hover:text-white border-b border-gray-50 last:border-0"
                                                                >
                                                                    {sp.name}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/sales/salespersons/new")}
                                                        className="w-full p-2.5 text-blue-600 text-[13px] font-medium border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2 justify-center"
                                                    >
                                                        <Plus size={14} /> Manage Salespersons
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Associate Project(s) Hours</label>
                                        <div className="text-[13px] text-gray-500">There are no active projects for this customer.</div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4" />

                                    <div className="flex items-center">
                                        <label className="text-[13px] text-[#d9534f] w-44 shrink-0">zxc*</label>
                                        <div className="relative w-full">
                                            <select
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none appearance-none bg-white"
                                                value={formData.customZxc}
                                                onChange={(e) => handleChange("customZxc", e.target.value)}
                                            >
                                                <option value="">Select</option>
                                                <option value="ZXC">ZXC</option>
                                            </select>
                                            <ChevronDown size={14} className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-gray-400" />
                                            {formData.customZxc && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChange("customZxc", "")}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500"
                                                    aria-label="Clear"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4" />

                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Payment Mode</label>
                                        <label className="flex items-center gap-2 text-[13px] text-gray-600">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0"
                                                checked={formData.paymentMode === "offline"}
                                                onChange={(e) => handleChange("paymentMode", e.target.checked ? "offline" : "online")}
                                            />
                                            Collect payment offline
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Payment Terms</label>
                                        <div className="relative w-60">
                                            <select
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none appearance-none bg-white"
                                                value={formData.paymentTerms}
                                                onChange={(e) => handleChange("paymentTerms", e.target.value)}
                                            >
                                                {["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"].map((term) => (
                                                    <option key={term} value={term}>{term}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-[13px] text-gray-600 w-44 shrink-0">Partial Payments</label>
                                        <label className="flex items-center gap-2 text-[13px] text-gray-600">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0"
                                                checked={formData.partialPayments}
                                                onChange={(e) => handleChange("partialPayments", e.target.checked)}
                                            />
                                            Enable Partial Payments
                                        </label>
                                    </div>
                                    <div className="text-[12px] text-gray-500 pl-44">
                                        Want to get paid faster? Set up Payment Gateway
                                    </div>

                                    <div className="border-t border-gray-100 pt-4" />
                                    <button
                                        type="button"
                                        onClick={() => setShowOtherPreferences((prev) => !prev)}
                                        className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700"
                                    >
                                        Other Preferences
                                        <ChevronRight size={14} className={`transition-transform ${showOtherPreferences ? "rotate-90" : ""}`} />
                                    </button>

                                    {showOtherPreferences && (
                                        <div className="space-y-4">
                                            <div className="flex items-center">
                                                <label className="text-[13px] text-gray-600 w-44 shrink-0">Invoice Template</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] text-gray-700">{formData.invoiceTemplate}</span>
                                                    <Pencil size={14} className="text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <label className="text-[13px] text-gray-600 w-44 shrink-0">Round Off Preference</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] text-gray-700">{formData.roundOffPreference}</span>
                                                    <Pencil size={14} className="text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <label className="text-[13px] text-gray-600 w-44 shrink-0 flex items-center gap-2">
                                                    Customer Notes
                                                    <Info size={12} className="text-gray-400" />
                                                </label>
                                                <textarea
                                                    className="w-full min-h-[90px] px-3 py-2 border border-gray-300 rounded text-[13px] outline-none"
                                                    value={formData.customerNotes}
                                                    onChange={(e) => handleChange("customerNotes", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional preferences hidden for now */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {isAddressModalOpen && (
                <div
                    className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/55 p-4"
                    onClick={() => !isAddressSaving && setIsAddressModalOpen(false)}
                >
                    <div className="w-full max-w-[520px] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="text-[16px] font-semibold text-slate-800">
                                {addressModalType === "billing" ? "Billing Address" : "Shipping Address"}
                            </h3>
                            <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
                                onClick={() => setIsAddressModalOpen(false)}
                                disabled={isAddressSaving}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
                            <div>
                                <label className="mb-1 block text-[13px] text-slate-700">Attention</label>
                                <input
                                    className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                    name="attention"
                                    value={addressFormData.attention}
                                    onChange={handleAddressFieldChange}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[13px] text-slate-700">Country/Region</label>
                                    <div className="relative" ref={countryDropdownRef}>
                                        <div className="relative">
                                            <input
                                                className="h-9 w-full rounded-md border border-slate-300 px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                                name="country"
                                                value={isCountryDropdownOpen ? countrySearch : addressFormData.country}
                                                onChange={(e) => {
                                                    setCountrySearch(e.target.value);
                                                    if (!isCountryDropdownOpen) setIsCountryDropdownOpen(true);
                                                }}
                                                onFocus={() => {
                                                    setCountrySearch("");
                                                    setIsCountryDropdownOpen(true);
                                                }}
                                                placeholder="Select or type to add"
                                            />
                                            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    {isCountryDropdownOpen && (
                                        <div className="absolute left-0 top-full z-[13000] mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
                                            {filteredCountryOptions.length === 0 ? (
                                                <div className="px-3 py-2 text-[12px] text-slate-500">No matching country</div>
                                            ) : (
                                                filteredCountryOptions.map((country: any) => (
                                                    <button
                                                        key={country.isoCode}
                                                        type="button"
                                                        className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#22b573] hover:text-white ${
                                                            String(addressFormData.country || "").toLowerCase() === String(country.name || "").toLowerCase()
                                                                ? "bg-[#22b573] text-white"
                                                                : "text-slate-700"
                                                        }`}
                                                            onClick={() => {
                                                                const match = PHONE_COUNTRY_OPTIONS.find(
                                                                    (entry) => String(entry.name || "").trim().toLowerCase() === String(country.name || "").trim().toLowerCase()
                                                                );
                                                                setAddressFormData((prev) => ({
                                                                    ...prev,
                                                                    country: country.name,
                                                                    state: "",
                                                                    phoneCountryCode: match?.phoneCode || prev.phoneCountryCode,
                                                                }));
                                                                setIsCountryDropdownOpen(false);
                                                                setCountrySearch("");
                                                            }}
                                                        >
                                                            {country.name}
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-[13px] text-slate-700">Address</label>
                                <textarea
                                    className="min-h-[48px] w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                    name="street1"
                                    value={addressFormData.street1}
                                    onChange={handleAddressFieldChange}
                                    placeholder="Street 1"
                                />
                                <textarea
                                    className="mt-2 min-h-[48px] w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                    name="street2"
                                    value={addressFormData.street2}
                                    onChange={handleAddressFieldChange}
                                    placeholder="Street 2"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[13px] text-slate-700">City</label>
                                <input
                                    className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                    name="city"
                                    value={addressFormData.city}
                                    onChange={handleAddressFieldChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-[13px] text-slate-700">State</label>
                                    <div className="relative" ref={stateDropdownRef}>
                                        <div className="relative">
                                            <input
                                                className="h-9 w-full rounded-md border border-slate-300 px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                                name="state"
                                                value={isStateDropdownOpen ? stateSearch : addressFormData.state}
                                                onChange={(e) => {
                                                    setStateSearch(e.target.value);
                                                    if (!isStateDropdownOpen) setIsStateDropdownOpen(true);
                                                }}
                                                onFocus={() => {
                                                    setStateSearch("");
                                                    setIsStateDropdownOpen(true);
                                                }}
                                                placeholder="Select or type to add"
                                            />
                                            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                        {isStateDropdownOpen && (
                                            <div className="absolute left-0 top-full z-[13000] mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl">
                                                {filteredStateOptions.length === 0 ? (
                                                    <div className="px-3 py-2 text-[12px] text-slate-500">No matching state</div>
                                                ) : (
                                                    filteredStateOptions.map((state: any) => (
                                                        <button
                                                            key={state.isoCode}
                                                            type="button"
                                                            className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#22b573] hover:text-white ${
                                                                String(addressFormData.state || "").toLowerCase() === String(state.name || "").toLowerCase()
                                                                    ? "bg-[#22b573] text-white"
                                                                    : "text-slate-700"
                                                            }`}
                                                            onClick={() => {
                                                                setAddressFormData((prev) => ({ ...prev, state: state.name }));
                                                                setIsStateDropdownOpen(false);
                                                                setStateSearch("");
                                                            }}
                                                        >
                                                            {state.name}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[13px] text-slate-700">ZIP Code</label>
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                        name="zipCode"
                                        value={addressFormData.zipCode}
                                        onChange={handleAddressFieldChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-[13px] text-slate-700">Phone</label>
                                    <div className="grid grid-cols-[64px_1fr] gap-0">
                                        <div className="relative" ref={phoneCodeDropdownRef}>
                                            <button
                                                type="button"
                                                className="flex h-9 w-full items-center justify-between rounded-l border border-slate-300 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-[#22b573]"
                                                onClick={() => {
                                                    setIsPhoneCodeDropdownOpen((prev) => !prev);
                                                    setPhoneCodeSearch("");
                                                }}
                                            >
                                                <span>{addressFormData.phoneCountryCode || "+"}</span>
                                                {isPhoneCodeDropdownOpen ? (
                                                    <ChevronUp size={13} className="text-slate-400" />
                                                ) : (
                                                    <ChevronDown size={13} className="text-slate-400" />
                                                )}
                                            </button>

                                            {isPhoneCodeDropdownOpen && (
                                                <div className="absolute left-0 bottom-full z-[13000] mb-2 w-[280px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                                                    <div className="border-b border-slate-100 p-2">
                                                        <div className="relative">
                                                            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                value={phoneCodeSearch}
                                                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                                                placeholder="Search"
                                                                className="h-8 w-full rounded border border-slate-300 pl-7 pr-2 text-[12px] text-slate-700 outline-none focus:border-[#22b573]"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-56 overflow-y-auto">
                                                        {filteredPhoneCountryOptions.length === 0 ? (
                                                            <div className="px-3 py-2 text-[12px] text-slate-500">No matching country code</div>
                                                        ) : (
                                                            filteredPhoneCountryOptions.map((country: any) => (
                                                                <button
                                                                    key={`${country.isoCode}-${country.phoneCode}`}
                                                                    type="button"
                                                                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#22b573] hover:text-white ${addressFormData.phoneCountryCode === country.phoneCode ? "bg-[#22b573] text-white" : "text-slate-700"}`}
                                                                    onClick={() => {
                                                                        setAddressFormData((prev: any) => ({ ...prev, phoneCountryCode: country.phoneCode }));
                                                                        setIsPhoneCodeDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <span className="inline-block w-12">{country.phoneCode}</span>
                                                                    <span>{country.name}</span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            className="h-9 rounded-r border border-l-0 border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                            name="phone"
                                            value={addressFormData.phone}
                                            onChange={handleAddressFieldChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[13px] text-slate-700">Fax Number</label>
                                    <input
                                        className="h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-[#22b573]"
                                        name="fax"
                                        value={addressFormData.fax}
                                        onChange={handleAddressFieldChange}
                                    />
                                </div>
                            </div>

                            <p className="text-[12px] text-slate-500">
                                <span className="font-semibold text-slate-600">Note:</span> Changes made here will be updated for this customer.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                className="rounded-md bg-[#22b573] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1ea465] disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={handleSaveAddress}
                                disabled={isAddressSaving}
                            >
                                {isAddressSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => setIsAddressModalOpen(false)}
                                disabled={isAddressSaving}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t border-gray-100 py-4 px-8 flex items-center gap-4 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => {
                        if (formData.contentType === "product") {
                            if (!formData.customerId || !formData.productId || formData.planName === "Select a Plan") {
                                toast.error("Please fill in all required fields (Customer, Product, and Plan).");
                                return;
                            }
                        } else {
                            if (!formData.customerId) {
                                toast.error("Please select a customer.");
                                return;
                            }
                            const validItems = formData.items.filter(it => it.itemDetails.trim() !== "");
                            if (validItems.length === 0) {
                                toast.error("Please add at least one item to the subscription.");
                                return;
                            }
                        }
                        const selectedTax = taxes.find((t) => String(t.name || "").trim() === String(formData.tax || "").trim());
                        try {
                            sessionStorage.setItem(
                                "taban_subscription_draft_v1",
                                JSON.stringify({ ...formData, addonLines })
                            );
                        } catch {
                            // ignore storage errors
                        }
                        navigate("/sales/subscriptions/preview", {
                            state: {
                                currency: formData.currency,
                                customerId: formData.customerId,
                                productName: formData.productName,
                                planName: formData.planName,
                                quantity: formData.quantity,
                                price: formData.price,
                                tax: formData.tax,
                                taxRate: selectedTax ? Number(selectedTax.rate) : 0,
                                startDate: formData.startDate,
                                coupon: formData.coupon,
                                couponCode: formData.couponCode,
                                couponValue: formData.couponValue,
                                applyChanges: formData.applyChanges,
                                applyChangesDate: formData.applyChangesDate,
                                backdatedGenerateInvoice: formData.backdatedGenerateInvoice,
                                addons: addonLines
                                    .filter((line) => String(line.addonName || "").trim())
                                    .map((line) => ({
                                        name: line.addonName,
                                        quantity: Number(line.quantity || 0) || 0,
                                        rate: Number(line.rate || 0) || 0,
                                        tax: line.tax,
                                        taxRate: Number(line.taxRate || 0) || 0,
                                    })),
                            },
                        });
                    }}
                    className={`px-6 py-2 text-white rounded font-bold text-[13px] shadow-sm transition-all shadow-blue-200 ${((formData.contentType === "product" && (!formData.productId || formData.planName === "Select a Plan")) || !formData.customerId) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95"}`}
                >
                    Continue
                </button>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded font-bold text-[13px] hover:bg-gray-50 hover:border-gray-300 transition-all active:transform active:scale-95"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default NewSubscriptionPage;
