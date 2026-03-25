import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
import { locationsAPI, settingsAPI, transactionNumberSeriesAPI } from "../../../../../../services/api";
import { toast } from "react-toastify";
import { COUNTRIES } from "../../../../../../constants/countries";
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

export default function EditLocationPage() {
  const { id: paramId } = useParams();
  const routeLocation = useLocation();
  const rawId =
    paramId ||
    routeLocation.pathname.split("/locations/edit/")[1] ||
    "";
  const effectiveId = rawId.split("?")[0].split("#")[0];
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
  const defaultFormData: LocationData = {
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
  };

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

  const [isChild, setIsChild] = useState(false);
  const [provideAccessToAll, setProvideAccessToAll] = useState(false);
  const allUsersSelected =
    allUsers.length > 0 && (formData.locationAccess?.length || 0) === allUsers.length;
  const [orgCountry, setOrgCountry] = useState<string>("");
  const [txSeriesNames, setTxSeriesNames] = useState<string[]>([]);
  const [loadingTxSeries, setLoadingTxSeries] = useState(false);

  const buildAccessFromUser = (user: User) => ({
    userId: user._id || user.id,
    userName: user.name || `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    role: extractRoleString(user.role),
  });

  const setAllUsersAccess = () => {
    const accessList = allUsers
      .map(buildAccessFromUser)
      .filter((access) => access.userId);
    setFormData((prev) => ({ ...prev, locationAccess: accessList }));
  };
  const parentOptions = readLocations().filter((loc: any) => {
    const locId = String(loc?._id || loc?.id || "");
    const currentId = String(effectiveId || "");
    if (!loc?.name) return false;
    if (currentId && locId && locId === currentId) return false;
    return true;
  });
  const filteredParentOptions = parentOptions.filter((loc: any) =>
    String(loc.name || "")
      .toLowerCase()
      .includes(parentSearch.toLowerCase())
  );
  const readProfileCountry = () => {
    const local = localStorage.getItem("org_profile");
    if (!local) return "";
    try {
      const parsed = JSON.parse(local);
      return (
        parsed?.location ||
        parsed?.address?.country ||
        ""
      );
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
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

        if (!effectiveId) {
          setError("Location not found.");
          return;
        }
        const idKey = String(effectiveId || "");

        let locationToEdit: any = null;
        try {
          const apiRes = await locationsAPI.getById(idKey);
          if (apiRes?.success) locationToEdit = apiRes.data;
        } catch {
          // ignore
        }

        const existingLocations = locationToEdit ? [] : readLocations();
        const matchesId = (loc: any) => String(loc?._id || loc?.id || loc?.name || "") === idKey;
        if (!locationToEdit) locationToEdit = existingLocations.find(matchesId);

        if (locationToEdit) {
          setError(null);
          const normalized = {
            ...defaultFormData,
            ...locationToEdit,
            parentLocation: locationToEdit.parentLocation ?? "None",
            logo: locationToEdit.logo ?? "Same as Organization Logo",
            address: {
              ...defaultFormData.address,
              ...(locationToEdit.address || {}),
            },
            locationAccess: Array.isArray(locationToEdit.locationAccess)
              ? locationToEdit.locationAccess
              : [],
          } as any;
          setFormData(normalized);
          if (locationToEdit.logo && locationToEdit.logo !== "Same as Organization Logo" && locationToEdit.logo !== "Upload a New Logo") {
            setLogoPreview(locationToEdit.logo);
          }
          if (locationToEdit.parentLocation && locationToEdit.parentLocation !== "None") {
            setIsChild(true);
          }
        } else {
          const fallbackMatch = idKey
            ? existingLocations.find((loc: any) =>
                String(loc?._id || loc?.id || "")
                  .toLowerCase()
                  .includes(idKey.toLowerCase())
              )
            : null;
          if (fallbackMatch) {
            setError(null);
            const normalized = {
              ...defaultFormData,
              ...fallbackMatch,
              parentLocation: fallbackMatch.parentLocation ?? "None",
              logo: fallbackMatch.logo ?? "Same as Organization Logo",
              address: {
                ...defaultFormData.address,
                ...(fallbackMatch.address || {}),
              },
              locationAccess: Array.isArray(fallbackMatch.locationAccess)
                ? fallbackMatch.locationAccess
                : [],
            } as any;
            setFormData(normalized);
            if (fallbackMatch.logo && fallbackMatch.logo !== "Same as Organization Logo" && fallbackMatch.logo !== "Upload a New Logo") {
              setLogoPreview(fallbackMatch.logo);
            }
            if (fallbackMatch.parentLocation && fallbackMatch.parentLocation !== "None") {
              setIsChild(true);
            }
          } else {
            setError("Location not found.");
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [effectiveId, navigate]);

  useEffect(() => {
    const loadOrgCountry = async () => {
      try {
        let country = readProfileCountry();
        if (!country) {
          const res = await settingsAPI.getOrganizationProfile();
          country =
            res?.data?.location ||
            res?.data?.address?.country ||
            res?.data?.country ||
            "";
        }
        if (country) setOrgCountry(country);
      } catch {
        // ignore
      }
    };
    loadOrgCountry();
  }, []);

  useEffect(() => {
    if (formData.type !== "Business") return;
    void (async () => {
      try {
        setLoadingTxSeries(true);
        const res = await transactionNumberSeriesAPI.getAll({ limit: 10000 });
        const rows = Array.isArray(res?.data) ? res.data : [];
        const names = Array.from(
          new Set(
            rows
              .map((r: any) => String(r?.seriesName || r?.name || "").trim())
              .filter(Boolean)
          )
        ).sort((a: any, b: any) => String(a).localeCompare(String(b))) as string[];
        setTxSeriesNames(names);
        if (names.length > 0) {
          setFormData((prev) => ({
            ...prev,
            transactionNumberSeriesId: prev.transactionNumberSeriesId || names[0] || "",
            defaultTransactionNumberSeriesId: prev.defaultTransactionNumberSeriesId || names[0] || "",
          }));
        }
      } catch (e) {
        console.warn("Failed to load transaction series:", e);
      } finally {
        setLoadingTxSeries(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type]);

  useEffect(() => {
    // Refresh locations cache for dropdowns, etc.
    void (async () => {
      try {
        const res = await locationsAPI.getAll({ limit: 10000 });
        if (res?.success) {
          const rows = Array.isArray(res.data) ? res.data : [];
          writeLocations(rows);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!orgCountry) return;
    setFormData((prev) =>
      prev?.address?.country && String(prev.address.country).trim() && String(prev.address.country).trim() !== "United Kingdom"
        ? prev
        : {
            ...prev,
            address: {
              ...prev.address,
              country: orgCountry,
            },
          }
    );
  }, [formData.type, orgCountry]);

  useEffect(() => {
    if (!provideAccessToAll) return;
    setAllUsersAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsers]);

  useEffect(() => {
    if (!provideAccessToAll) return;
    const allSelected =
      allUsers.length > 0 && (formData.locationAccess?.length || 0) === allUsers.length;
    if (!allSelected) {
      setProvideAccessToAll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.locationAccess, allUsers.length]);

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

  const handleAddUser = (user: User) => {
    const userId = user._id || user.id;
    if (userId && !formData.locationAccess.find(access => access.userId === userId)) {
      setFormData(prev => ({
        ...prev,
        locationAccess: [
          ...prev.locationAccess,
          buildAccessFromUser(user)
        ]
      }));
    }
    setIsUserDropdownOpen(false);
    setUserSearch("");
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

      const payload: any = {
        ...formData,
        parentLocation: formData.parentLocation === "None" ? "" : formData.parentLocation,
        defaultTransactionSeries: formData.defaultTransactionNumberSeriesId || formData.transactionNumberSeriesId || "",
      };

      const updated = await locationsAPI.update(String(effectiveId), payload);
      if (!updated?.success) {
        throw new Error(updated?.message || "Failed to update location");
      }

      const list = await locationsAPI.getAll({ limit: 10000 });
      if (list?.success) {
        writeLocations(Array.isArray(list.data) ? list.data : []);
      }

      writeLocationsEnabled(true);
      toast.success("Location updated successfully.");
      navigate('/settings/locations');
    } catch (error: any) {
      console.error('Error updating location:', error);
      setError(error.message || 'An error occurred while updating the location. Please try again.');
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
  const selectedUserIds = new Set((formData.locationAccess || []).map(a => String(a.userId)));
  const availableUsers = filteredUsers.filter(u => !selectedUserIds.has(String(u._id || u.id)));

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 animate-pulse font-medium">Loading location data...</div>
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
        <h1 className="text-xl font-semibold text-gray-900">Update Location</h1>
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
            <div className="text-sm font-medium text-gray-700 mb-3">Location Type</div>
            <div className="grid grid-cols-2 gap-4">
              <label className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition ${
                formData.type === "Business"
                  ? "border-blue-500 ring-1 ring-blue-500/20 bg-white"
                  : "border-gray-200 hover:border-gray-300 bg-white"
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
                <p className="text-[12px] leading-relaxed text-gray-500 ml-7">A Business Location represents your organization or office's operational location. It is used to record transactions, assess regional performance, and monitor stock levels for items stored at this location.</p>
              </label>
              <label className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition ${
                formData.type === "Warehouse"
                  ? "border-blue-500 ring-1 ring-blue-500/20 bg-white"
                  : "border-gray-200 hover:border-gray-300 bg-white"
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
                <p className="text-[12px] leading-relaxed text-gray-500 ml-7">A Warehouse Only Location refers to where your items are stored. It helps track and monitor stock levels for items stored at this location.</p>
              </label>
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
                    <div className="mt-4 flex items-start gap-6">
                      <div 
                        onClick={handleLogoClick}
                        className="w-48 h-28 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group"
                      >
                        {logoPreview ? (
                          <div className="relative w-full h-full flex items-center justify-center p-2">
                            <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                <Upload size={20} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload size={20} className="text-gray-400 mb-2" />
                            <span className="text-[11px] text-gray-500 font-medium">Upload your Location Logo</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-1.5 pt-1">
                        <p className="text-[11px] text-gray-600">
                          This logo will be displayed in transaction PDFs and email notifications. <span className="text-blue-600 cursor-pointer hover:underline">Preferred Image</span>
                        </p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-gray-400">Dimensions: 240 × 240 pixels @ 72 DPI</p>
                          <p className="text-[10px] text-gray-400">Supported Files: jpg, jpeg, png, gif, bmp</p>
                          <p className="text-[10px] text-gray-400">Maximum File Size: 1MB</p>
                        </div>
                        {logoPreview && (
                            <button type="button" onClick={handleRemoveLogo} className="text-[10px] text-red-500 font-medium hover:underline pt-1">Remove Logo</button>
                        )}
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
            <div className="grid grid-cols-3 gap-4 items-start">
              <label className="text-sm font-medium text-red-500 pt-1.5">Name*</label>
              <div className="col-span-2 space-y-3">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="wrrf"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  required
                />
                {formData.type === "Business" && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${isChild ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {isChild && <Check size={10} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isChild} 
                    onChange={(e) => {
                        const checked = e.target.checked;
                        setIsChild(checked);
                        if (!checked) setFormData(prev => ({ ...prev, parentLocation: "None" }));
                    }} 
                    className="hidden" 
                  />
                  <span className="text-sm text-gray-600">This is a Child Location</span>
                </label>
                )}
              </div>
            </div>
          </div>

          {/* Parent Location Section */}
          {(isChild || formData.type === "Warehouse") && (
            <div className="px-6 py-4 border-b border-gray-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-red-500">Parent Location*</label>
                <div className="col-span-2 relative" ref={parentDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-left flex items-center justify-between bg-white overflow-hidden"
                  >
                    <span className={formData.parentLocation === "None" || !formData.parentLocation ? "text-gray-400" : "text-gray-700"}>
                        {formData.parentLocation === "None" || !formData.parentLocation ? "Select Location" : formData.parentLocation}
                    </span>
                    <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
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
                            {parentOptions.length === 0 && (
                              <button 
                                type="button" 
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                onClick={() => { setFormData(prev => ({ ...prev, parentLocation: "None" })); setIsParentDropdownOpen(false); }}
                              >
                                  <span>None</span>
                                  {formData.parentLocation === "None" && <Check size={14} className="text-blue-600" />}
                              </button>
                            )}
                            {filteredParentOptions.map((loc: any) => (
                              <button
                                key={String(loc._id || loc.id || loc.name)}
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, parentLocation: loc.name }));
                                  setIsParentDropdownOpen(false);
                                }}
                              >
                                <span>{loc.name}</span>
                                {formData.parentLocation === loc.name && <Check size={14} className="text-blue-600" />}
                              </button>
                            ))}
                            {filteredParentOptions.length === 0 && (
                              <div className="px-4 py-2 text-sm text-gray-400">No locations found</div>
                            )}
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Address Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700 pt-2">Address</label>
              <div className="col-span-2 space-y-3">
                <div className="grid grid-cols-3 gap-4 items-center">
                    <input type="text" name="address.attention" value={formData.address.attention} onChange={handleChange} placeholder="Attention" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <input type="text" name="address.street1" value={formData.address.street1} onChange={handleChange} placeholder="Street 1" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <input type="text" name="address.street2" value={formData.address.street2} onChange={handleChange} placeholder="Street 2" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input type="text" name="address.city" value={formData.address.city} onChange={handleChange} placeholder="City" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                        <input type="text" name="address.zipCode" value={formData.address.zipCode} onChange={handleChange} placeholder="ZIP/Postal Code" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <select
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleChange}
                      disabled={formData.type === "Business"}
                      className={`col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm ${formData.type === "Business" ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                    >
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                        <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} placeholder="State/Province" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                        <input type="text" name="address.phone" value={formData.address.phone} onChange={handleChange} placeholder="Phone" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                    <input type="text" name="address.fax" value={formData.address.fax} onChange={handleChange} placeholder="Fax Number" className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm" />
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
                placeholder="Website URL"
                className="col-span-2 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className={`text-sm font-medium ${formData.type === "Business" ? "text-red-500" : "text-gray-700"}`}>
                Primary Contact{formData.type === "Business" && "*"}
              </label>
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
                        <label className="text-sm font-medium text-red-500">Transaction Number Series*</label>
                        <select
                          name="transactionNumberSeriesId"
                          value={formData.transactionNumberSeriesId}
                          onChange={handleChange}
                          disabled={loadingTxSeries}
                          className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                        >
                            <option value="">{loadingTxSeries ? "Loading..." : "Select Transaction Series"}</option>
                            {txSeriesNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-sm font-medium text-red-500">Default Transaction Number Series*</label>
                        <select
                          name="defaultTransactionNumberSeriesId"
                          value={formData.defaultTransactionNumberSeriesId}
                          onChange={handleChange}
                          disabled={loadingTxSeries}
                          className="col-span-2 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                        >
                            <option value="">{loadingTxSeries ? "Loading..." : "Select Default Series"}</option>
                            {txSeriesNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </>
          )}

          {/* Location Access Section */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Location Access</label>
                <p className="text-[10px] text-gray-400 mt-1">Define who can manage this location.</p>
              </div>
              <div className="col-span-2">
                <div className="border border-gray-200 rounded-lg bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span className="font-medium">{formData.locationAccess?.length || 0} user(s) selected</span>
                    </div>
                    {!allUsersSelected && (
                      <label className="flex items-center gap-2 cursor-pointer group text-xs text-gray-600">
                        <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${provideAccessToAll ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
                          {provideAccessToAll && <Check size={10} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={provideAccessToAll}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setProvideAccessToAll(checked);
                            if (checked) {
                              setAllUsersAccess();
                            }
                          }}
                          className="hidden" 
                        />
                        <span>Provide access to all users</span>
                      </label>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-none overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider">Users</th>
                        <th className="px-4 py-2 font-medium text-gray-600 text-[11px] uppercase tracking-wider">Role</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.locationAccess?.map((access, index) => (
                        <tr key={index} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                {allUsers.find(u => (u._id || u.id) === access.userId)?.image ? (
                                    <img src={allUsers.find(u => (u._id || u.id) === access.userId)?.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={16} className="text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{access.userName}</div>
                                <div className="text-xs text-gray-500">{access.userEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs italic">
                            {access.role || "User's Role"}
                          </td>
                          <td className="px-4 py-3 text-right">
                             <button type="button" onClick={() => handleRemoveUser(access.userId)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={14} />
                             </button>
                          </td>
                        </tr>
                      ))}
                      {!provideAccessToAll && (
                        <tr>
                          <td className="px-4 py-2">
                            <div className="relative" ref={userDropdownRef}>
                              <button 
                                type="button"
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className="w-full px-3 py-2 border border-gray-200 rounded text-xs text-left text-gray-500 hover:border-gray-300 transition-colors flex items-center justify-between bg-white"
                              >
                                <span>Select users</span>
                                <ChevronDown size={14} />
                              </button>
                              {isUserDropdownOpen && (
                                <div className="absolute z-50 w-full bottom-full mb-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                                  <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <input 
                                        type="text" 
                                        placeholder="Search" 
                                        className="w-full pl-8 pr-3 py-1 text-xs border-none focus:ring-0" 
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {availableUsers.length > 0 ? (
                                      availableUsers.map(u => (
                                          <button 
                                            key={u._id || u.id} 
                                            type="button" 
                                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-3"
                                            onClick={() => handleAddUser(u)}
                                          >
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                              {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" /> : <User size={12} className="text-gray-400" />}
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">{u.name || `${u.firstName} ${u.lastName}`}</div>
                                              <div className="text-[10px] text-gray-500">{u.email}</div>
                                            </div>
                                          </button>
                                        ))
                                    ) : (
                                      <div className="px-4 py-2 text-xs text-gray-500">All users selected</div>
                                    )}
                                    </div>
                                  </div>
                               )}
                             </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="w-full h-8 flex items-center px-3 border border-gray-200 rounded text-[11px] text-gray-400 bg-gray-50/50 italic">
                              User's Role
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic mt-2">Selected users can create and access transactions for this location.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update Location'}
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
