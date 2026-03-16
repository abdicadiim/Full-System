import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  MapPin, 
  Globe, 
  User, 
  Phone, 
  Mail, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  X, 
  Search, 
  Upload, 
  Check,
  Package,
  ArrowLeft
} from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../../services/auth";
import {
  readLocations,
  writeLocations,
  writeLocationsEnabled,
  getDemoUsers
} from "../storage";

interface User {
  _id?: string;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: any;
  image?: string;
}

interface LocationData {
  _id?: string;
  id?: string;
  type: "Business" | "Warehouse";
  logo: string;
  name: string;
  parentLocation: string;
  address: {
    attention: string;
    street1: string;
    street2: string;
    city: string;
    zipCode: string;
    country: string;
    state: string;
    phone: string;
    fax: string;
  };
  website: string;
  primaryContact: string;
  transactionNumberSeriesId: string;
  defaultTransactionNumberSeriesId: string;
  locationAccess: Array<{
    userId: string;
    userName?: string;
    userEmail?: string;
    role?: string;
  }>;
}

const extractRoleString = (role: any): string => {
  if (!role) return "";
  if (typeof role === 'string') return role;
  if (typeof role === 'object') {
    return role.name || role.code || "";
  }
  return String(role);
};

export default function AddLocationPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<LocationData>({
    type: "Business",
    logo: "Same as Organization Logo",
    name: "",
    parentLocation: "None",
    address: {
      attention: "",
      street1: "",
      street2: "",
      city: "",
      zipCode: "",
      country: "United Kingdom",
      state: "",
      phone: "",
      fax: "",
    },
    website: "",
    primaryContact: "",
    transactionNumberSeriesId: "",
    defaultTransactionNumberSeriesId: "",
    locationAccess: [],
  });

  const [isLogoDropdownOpen, setIsLogoDropdownOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoDropdownRef = useRef<HTMLDivElement>(null);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const parentDropdownRef = useRef<HTMLDivElement>(null);

  const [provideAccessToAll, setProvideAccessToAll] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const token = getToken();
        let fetchedUsers: User[] = [];

        try {
            if (token) {
                const userResponse = await fetch(`${API_BASE_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (userResponse.ok) {
                    const data = await userResponse.json();
                    if (data.success) fetchedUsers = data.data || [];
                }
            }
        } catch (e) {
            console.warn("API User fetch failed, using demo data");
        }

        if (fetchedUsers.length === 0) {
            fetchedUsers = getDemoUsers() as any;
        }
        setAllUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoDropdownRef.current && !logoDropdownRef.current.contains(event.target as Node)) {
        setIsLogoDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(event.target as Node)) {
        setIsParentDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof LocationData] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoOptionSelect = (option: string) => {
    setFormData(prev => ({ ...prev, logo: option }));
    setIsLogoDropdownOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: "Same as Organization Logo" }));
  };

  const handleUserSelect = (userId: string) => {
    const user = allUsers.find(u => (u._id || u.id) === userId);
    if (user && !formData.locationAccess.find(access => access.userId === userId)) {
      setFormData(prev => ({
        ...prev,
        locationAccess: [
          ...prev.locationAccess,
          {
            userId,
            userName: user.name || `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            role: extractRoleString(user.role),
          }
        ]
      }));
    }
    setIsUserDropdownOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      locationAccess: prev.locationAccess.filter(access => access.userId !== userId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Location name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const existingRows = readLocations();
      const now = new Date().toISOString();
      const newId = `loc-${Date.now()}`;
      
      const newLocation = {
          ...formData,
          _id: newId,
          id: newId,
          createdAt: now,
          updatedAt: now,
      };

      writeLocations([...existingRows, newLocation]);
      writeLocationsEnabled(true);
      navigate('/settings/locations');
    } catch (error: any) {
      console.error('Error saving location:', error);
      setError(error.message || 'An error occurred while saving the location.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/settings/locations');
  };

  const filteredUsers = allUsers.filter(user => 
    (user.name || `${user.firstName} ${user.lastName}` || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 animate-pulse font-medium">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 bg-gray-50">
      <div className="mb-6 flex items-center gap-4">
        <button 
            onClick={handleCancel}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
            <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Add Location</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm max-w-5xl">
        <form onSubmit={handleSubmit}>
          {/* Location Type Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700 pt-2">Location Type</label>
              <div className="col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <label className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition ${
                    formData.type === "Business"
                      ? "border-blue-500 bg-blue-50/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          formData.type === "Business" ? "border-blue-500" : "border-gray-300"
                      }`}>
                          {formData.type === "Business" && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      </div>
                      <input type="radio" name="type" value="Business" checked={formData.type === "Business"} onChange={handleChange} className="hidden" />
                      <span className="text-sm font-medium text-gray-900">Business Location</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-500 ml-7">A Business Location represents your organization or office's operational location. It is used to record transactions, assess regional performance, and monitor stock levels for items stored at this location.</p>
                  </label>
                  <label className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition ${
                    formData.type === "Warehouse"
                      ? "border-blue-500 bg-blue-50/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          formData.type === "Warehouse" ? "border-blue-500" : "border-gray-300"
                      }`}>
                          {formData.type === "Warehouse" && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      </div>
                      <input type="radio" name="type" value="Warehouse" checked={formData.type === "Warehouse"} onChange={handleChange} className="hidden" />
                      <span className="text-sm font-medium text-gray-900">Warehouse Only Location</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-500 ml-7">A Warehouse Only Location refers to where your items are stored. It helps track and monitor stock levels for items stored at this location.</p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Section */}
          {formData.type === "Business" && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <label className="text-sm font-medium text-gray-700 pt-2">Logo</label>
                <div className="col-span-2 space-y-3">
                  <div className="relative" ref={logoDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsLogoDropdownOpen(!isLogoDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-left flex items-center justify-between bg-white transition-colors"
                    >
                      <span className={formData.logo?.startsWith("data:") ? "text-blue-600 font-medium" : "text-gray-700"}>
                          {formData.logo?.startsWith("data:") ? "Custom Logo Uploaded" : (formData.logo || "Select Logo Option")}
                      </span>
                      {isLogoDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isLogoDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleLogoOptionSelect("Same as Organization Logo")}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span>Same as Organization Logo</span>
                            {formData.logo === "Same as Organization Logo" && <Check size={14} className="text-blue-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                                handleLogoOptionSelect("Upload a New Logo");
                                handleLogoClick();
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span>Upload a New Logo</span>
                            {formData.logo !== "Same as Organization Logo" && formData.logo !== "" && <Check size={14} className="text-blue-600" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {(formData.logo !== "Same as Organization Logo" || logoPreview) && (
                    <div className="mt-2 flex items-center gap-4 p-3 border border-gray-100 rounded bg-gray-50/50">
                      <div className="w-16 h-16 border border-gray-200 rounded bg-white flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Building2 size={24} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={handleLogoClick} className="text-xs text-blue-600 font-medium hover:underline">Change Logo</button>
                        <button type="button" onClick={handleRemoveLogo} className="text-xs text-red-500 font-medium hover:underline">Remove</button>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Name Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Location Name*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Name"
                className="col-span-2 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Parent Location Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Parent Location</label>
              <div className="col-span-2 relative" ref={parentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-left flex items-center justify-between bg-white"
                >
                  <span className="text-gray-700">{formData.parentLocation || "None"}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {isParentDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search" 
                                className="w-full pl-8 pr-3 py-1 text-sm border-none focus:ring-0" 
                                value={parentSearch}
                                onChange={(e) => setParentSearch(e.target.value)}
                            />
                          </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                          <button 
                            type="button" 
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                            onClick={() => { setFormData(prev => ({ ...prev, parentLocation: "None" })); setIsParentDropdownOpen(false); }}
                          >
                              <span>None</span>
                              {formData.parentLocation === "None" && <Check size={14} className="text-blue-600" />}
                          </button>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700 pt-2">Address</label>
              <div className="col-span-2 space-y-3">
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">Attention</label>
                    <input type="text" name="address.attention" value={formData.address.attention} onChange={handleChange} placeholder="Attention" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">Street 1</label>
                    <input type="text" name="address.street1" value={formData.address.street1} onChange={handleChange} placeholder="Street 1" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">Street 2</label>
                    <input type="text" name="address.street2" value={formData.address.street2} onChange={handleChange} placeholder="Street 2" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">City / Zip</label>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} placeholder="City" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                        <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} placeholder="ZIP Code" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">Country</label>
                    <select name="address.country" value={formData.address.country} onChange={handleChange} className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white">
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Kenya">Kenya</option>
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">State / Phone</label>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} placeholder="State" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                        <input type="text" name="address.phone" value={formData.address.phone} onChange={handleChange} placeholder="Phone" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-xs text-gray-500">Fax</label>
                    <input type="text" name="address.fax" value={formData.address.fax} onChange={handleChange} placeholder="Fax" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Website URL</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="col-span-2 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">Primary Contact*</label>
              <select
                name="primaryContact"
                value={formData.primaryContact}
                onChange={handleChange}
                className="col-span-2 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">Select Primary Contact</option>
                {allUsers.map(u => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.name || `${u.firstName} ${u.lastName}`} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>

          {formData.type === "Business" && (
            <>
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-sm font-medium text-gray-700">Transaction Number Series*</label>
                        <select className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white">
                            <option>Select Series</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-sm font-medium text-gray-700">Default Transaction Number Series*</label>
                        <select className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white">
                            <option>Select Default Series</option>
                        </select>
                    </div>
                </div>
            </>
          )}

          <div className="px-6 py-6 bg-gray-50/50">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Location Access</label>
                <p className="text-[11px] text-gray-500">Define who can manage this location.</p>
              </div>
              <div className="col-span-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${formData.locationAccess?.length > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs font-semibold text-gray-900">
                        {formData.locationAccess?.length || 0} user(s) selected
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={provideAccessToAll} 
                        onChange={(e) => setProvideAccessToAll(e.target.checked)} 
                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300" 
                      />
                      <span className="text-xs text-gray-600">Provide access to all users</span>
                    </label>
                  </div>
                  
                  <p className="text-[11px] text-gray-500 mb-4 italic">
                    Selected users can create and access transactions for this location.
                  </p>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-0 text-[10px] uppercase tracking-wider text-gray-400 font-bold">USERS</th>
                        <th className="text-left py-2 px-0 text-[10px] uppercase tracking-wider text-gray-400 font-bold">ROLE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {formData.locationAccess?.map((access, index) => {
                          const user = allUsers.find(u => (u._id || u.id) === access.userId);
                          return (
                            <tr key={index} className="group hover:bg-gray-50 transition-colors">
                              <td className="py-2.5 px-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                    {user?.image ? (
                                        <img src={user.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold font-sans">
                                            {(user?.name || user?.firstName || access.userName || '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">{access.userName || user?.name || `${user?.firstName} ${user?.lastName}`}</div>
                                    <div className="text-[11px] text-gray-500 truncate">{access.userEmail || user?.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">{extractRoleString(access.role) || "User"}</span>
                                  <button type="button" onClick={() => handleRemoveUser(access.userId)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 text-gray-400 transition-all">
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                      })}
                      <tr>
                        <td className="py-4 px-0 pr-4">
                            <div className="relative" ref={userDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm text-left flex items-center justify-between bg-white hover:border-gray-300 transition-colors"
                                >
                                    <span className="text-gray-400 italic">Select users</span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </button>

                                {isUserDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search"
                                                    value={userSearch}
                                                    onChange={(e) => setUserSearch(e.target.value)}
                                                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div className="py-1">
                                            {filteredUsers.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-gray-400 text-center uppercase tracking-tighter">NO RESULTS FOUND</div>
                                            ) : (
                                                filteredUsers.map((user) => (
                                                    <button
                                                        key={user._id || user.id}
                                                        type="button"
                                                        onClick={() => handleUserSelect(user._id || user.id)}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                            {(user.name || '').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-medium text-gray-900 truncate">{user.name}</div>
                                                            <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="py-4 px-0">
                            <select className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm bg-white text-gray-400 italic">
                                <option>User's Role</option>
                            </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
