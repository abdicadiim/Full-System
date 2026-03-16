import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getCurrentUser } from "../../../../../../services/auth";
import { Upload, X, ChevronDown, ChevronUp, Search, Check, Plus } from "lucide-react";
import {
  getDemoUsers,
  getLocationById,
  readLocations,
  writeLocations,
  writeLocationsEnabled,
} from "../storage";

export default function EditLocationPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams(); // May be undefined with wrapper route
  const location = useLocation();
  const id = routeId || location.pathname.split("/").filter(Boolean).pop() || "";
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: "Business",
    logo: "Same as Organization Logo",
    name: "",
    isChildLocation: false,
    parentLocation: "",
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
    transactionSeries: "",
    defaultTransactionSeries: "Default Transaction Series",
    locationAccess: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isLogoDropdownOpen, setIsLogoDropdownOpen] = useState(false);
  const [parentLocations, setParentLocations] = useState([]);
  const [isParentLocationDropdownOpen, setIsParentLocationDropdownOpen] = useState(false);
  const [parentLocationSearch, setParentLocationSearch] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [provideAccessToAll, setProvideAccessToAll] = useState(false);
  const [transactionSeriesList, setTransactionSeriesList] = useState(["Default Transaction Series"]);
  const [isTransactionSeriesDropdownOpen, setIsTransactionSeriesDropdownOpen] = useState(false);
  const [isDefaultTransactionSeriesDropdownOpen, setIsDefaultTransactionSeriesDropdownOpen] = useState(false);
  const [transactionSeriesSearch, setTransactionSeriesSearch] = useState("");
  const [defaultTransactionSeriesSearch, setDefaultTransactionSeriesSearch] = useState("");
  const fileInputRef = useRef(null);
  const logoDropdownRef = useRef(null);
  const parentLocationDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const transactionSeriesDropdownRef = useRef(null);
  const defaultTransactionSeriesDropdownRef = useRef(null);

  // Load location data when component mounts
  useEffect(() => {
    setIsLoading(true);
    try {
      const localLocation = getLocationById(String(id));
      if (!localLocation) {
        setError('Location not found');
        setIsLoading(false);
        return;
      }

      const currentUser = getCurrentUser();
      const demoUsers = getDemoUsers(currentUser);
      let website = "";
      if (localLocation.notes && String(localLocation.notes).includes("Website: ")) {
        website = String(localLocation.notes).split("Website: ")[1].split("\n")[0].trim();
      }

      const isChild = !!localLocation.parentLocation;
      let logoOption = "Same as Organization Logo";
      let preview = null;
      if (localLocation.logo && String(localLocation.logo).trim()) {
        logoOption = "Upload a New Logo";
        preview = localLocation.logo;
      }

      const matchedPrimaryContact =
        demoUsers.find((u: any) => u.email === localLocation.contactPerson?.email)?.id || demoUsers[0]?.id || "";

      setUsers(demoUsers);
      setAllUsers(demoUsers);
      setLogoPreview(preview);
      setFormData({
        type: localLocation.type || "Business",
        logo: logoOption,
        name: localLocation.name || "",
        isChildLocation: isChild,
        parentLocation: localLocation.parentLocation ? String(localLocation.parentLocation) : "",
        address: {
          attention: localLocation.address?.attention || "",
          street1: localLocation.address?.street1 || "",
          street2: localLocation.address?.street2 || "",
          city: localLocation.address?.city || "",
          zipCode: localLocation.address?.zipCode || "",
          country: localLocation.address?.country || "United Kingdom",
          state: localLocation.address?.state || "",
          phone: localLocation.address?.phone || "",
          fax: localLocation.address?.fax || "",
        },
        website,
        primaryContact: matchedPrimaryContact,
        transactionSeries: localLocation.defaultTransactionSeries || "",
        defaultTransactionSeries: localLocation.defaultTransactionSeries || "Default Transaction Series",
        locationAccess: [],
      });
      setError(null);
    } catch (error) {
      console.error('Error loading location:', error);
      setError('An error occurred while loading the location');
    } finally {
      setIsLoading(false);
    }
  }, [id]);



  // Load parent locations (same logic as AddLocationPage)
  useEffect(() => {
    if (formData.type === "Business" && !formData.isChildLocation) {
      setParentLocations([]);
      return;
    }

    setParentLocations(
      readLocations().filter((loc: any) => String(loc?._id || loc?.id) !== String(id) && loc?.isActive !== false)
    );
  }, [formData.type, formData.isChildLocation, id]);

  // Close dropdowns when clicking outside (same as AddLocationPage)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logoDropdownRef.current && !logoDropdownRef.current.contains(event.target)) {
        setIsLogoDropdownOpen(false);
      }
      if (parentLocationDropdownRef.current && !parentLocationDropdownRef.current.contains(event.target)) {
        setIsParentLocationDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
      if (transactionSeriesDropdownRef.current && !transactionSeriesDropdownRef.current.contains(event.target)) {
        setIsTransactionSeriesDropdownOpen(false);
      }
      if (defaultTransactionSeriesDropdownRef.current && !defaultTransactionSeriesDropdownRef.current.contains(event.target)) {
        setIsDefaultTransactionSeriesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle form changes (same as AddLocationPage)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (name === 'isChildLocation') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        parentLocation: checked ? prev.parentLocation : "",
      }));
    } else if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        isChildLocation: value === "Warehouse" ? false : prev.isChildLocation,
        logo: value === "Warehouse" ? "Same as Organization Logo" : prev.logo,
        transactionSeries: value === "Warehouse" ? "" : prev.transactionSeries,
        defaultTransactionSeries: value === "Warehouse" ? "Default Transaction Series" : prev.defaultTransactionSeries,
        website: value === "Warehouse" ? prev.website : prev.website,
        primaryContact: value === "Warehouse" ? prev.primaryContact : prev.primaryContact,
      }));
      setLogoImage(null);
      setLogoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  // Handle logo dropdown (same as AddLocationPage)
  const handleLogoOptionSelect = (option) => {
    setFormData(prev => ({ ...prev, logo: option }));
    setIsLogoDropdownOpen(false);

    if (option === "Upload a New Logo") {
      fileInputRef.current?.click();
    } else {
      setLogoImage(null);
      setLogoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle logo upload (same as AddLocationPage)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1024 * 1024) {
      setError('Logo file size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setLogoPreview(base64String);
    };
    reader.readAsDataURL(file);
    setLogoImage(file);
  };

  // Handle logo click
  const handleLogoClick = () => {
    if (!logoPreview) {
      fileInputRef.current?.click();
    }
  };

  // Handle remove logo
  const handleRemoveLogo = () => {
    setLogoImage(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: "Same as Organization Logo" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle parent location selection (same as AddLocationPage)
  const handleParentLocationSelect = (locationId) => {
    setFormData(prev => ({ ...prev, parentLocation: locationId }));
    setIsParentLocationDropdownOpen(false);
    setParentLocationSearch("");
  };

  // Handle transaction series selection (same as AddLocationPage)
  const handleTransactionSeriesSelect = (series) => {
    setFormData(prev => ({ ...prev, transactionSeries: series }));
    setIsTransactionSeriesDropdownOpen(false);
    setTransactionSeriesSearch("");
  };

  // Handle default transaction series selection (same as AddLocationPage)
  const handleDefaultTransactionSeriesSelect = (series) => {
    setFormData(prev => ({ ...prev, defaultTransactionSeries: series }));
    setIsDefaultTransactionSeriesDropdownOpen(false);
    setDefaultTransactionSeriesSearch("");
  };

  // Handle add new transaction series (same as AddLocationPage)
  const handleAddTransactionSeries = () => {
    navigate('/settings/customization/transaction-number-series');
    setIsTransactionSeriesDropdownOpen(false);
    setIsDefaultTransactionSeriesDropdownOpen(false);
  };

  // Handle user selection (same as AddLocationPage)
  const handleUserSelect = (userId) => {
    const user = allUsers.find(u => (u._id || u.id) === userId);
    if (user && !formData.locationAccess.find(access => access.userId === userId)) {
      setFormData(prev => ({
        ...prev,
        locationAccess: [...prev.locationAccess, {
          userId: userId,
          userName: user.name,
          userEmail: user.email,
          role: user.role || "Admin",
        }],
      }));
    }
    setIsUserDropdownOpen(false);
    setUserSearch("");
  };

  // Handle remove user (same as AddLocationPage)
  const handleRemoveUser = (userId) => {
    setFormData(prev => ({
      ...prev,
      locationAccess: prev.locationAccess.filter(access => access.userId !== userId),
    }));
  };

  // Filter functions (same as AddLocationPage)
  const filteredParentLocations = parentLocations.filter(location =>
    location.name.toLowerCase().includes(parentLocationSearch.toLowerCase())
  );

  const filteredTransactionSeries = transactionSeriesList.filter(series =>
    series.toLowerCase().includes(transactionSeriesSearch.toLowerCase())
  );

  const filteredDefaultTransactionSeries = transactionSeriesList.filter(series =>
    series.toLowerCase().includes(defaultTransactionSeriesSearch.toLowerCase())
  );

  const filteredUsers = allUsers.filter(user =>
    (user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     user.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const selectedParentLocation = parentLocations.find(loc => loc._id === formData.parentLocation);

  // Handle form submission - UPDATE instead of CREATE
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (!formData.name.trim()) {
        setError('Location name is required');
        setIsSaving(false);
        return;
      }

      // Validate parent location for Warehouse or Business child location
      if ((formData.type === "Warehouse" || (formData.type === "Business" && formData.isChildLocation)) && !formData.parentLocation) {
        setError('Parent Location is required');
        setIsSaving(false);
        return;
      }

      const selectedUser = users.find(u => (u._id || u.id) === formData.primaryContact);
      
      const locationData = {
        name: formData.name.trim(),
        type: formData.type === "Warehouse" ? "Warehouse" : "Business",
        address: {
          attention: formData.address.attention || "",
          street1: formData.address.street1 || "",
          street2: formData.address.street2 || "",
          city: formData.address.city || "",
          zipCode: formData.address.zipCode || "",
          country: formData.address.country || "United Kingdom",
          state: formData.address.state || "",
          phone: formData.address.phone || "",
          fax: formData.address.fax || "",
        },
        defaultTransactionSeries: formData.defaultTransactionSeries || "Default Transaction Series",
        contactPerson: {
          name: selectedUser?.name || "",
          email: selectedUser?.email || "",
          phone: formData.address.phone || "",
        },
        notes: formData.website ? `Website: ${formData.website}` : "",
        parentLocation: (formData.type === "Warehouse" || (formData.type === "Business" && formData.isChildLocation)) ? formData.parentLocation : null,
        logo: formData.type === "Business" && formData.logo === "Upload a New Logo" && logoPreview ? logoPreview : "",
      };
      const existingRows = readLocations();
      const now = new Date().toISOString();
      const nextRows = Array.isArray(existingRows)
        ? existingRows.map((row: any) =>
            String(row?._id || row?.id) === String(id)
              ? {
                  ...row,
                  ...locationData,
                  _id: String(row?._id || row?.id || id),
                  id: String(row?._id || row?.id || id),
                  updatedAt: now,
                }
              : row
          )
        : [];

      writeLocations(nextRows);
      writeLocationsEnabled(true);
      navigate('/settings/locations');
    } catch (error) {
      console.error('Error updating location:', error);
      setError(error.message || 'An error occurred while updating the location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/settings/locations');
  };

  if (isLoading) {
    return (
      <div className="w-full h-full p-6">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading location data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Update Location</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Type Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Location Type</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition ${
              formData.type === "Business" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="radio"
                  name="type"
                  value="Business"
                  checked={formData.type === "Business"}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-900">Business Location</span>
              </div>
              <p className="text-xs text-gray-600 ml-7">
                A Business Location represents your organization or office's operational location. It is used to record transactions, assess regional performance, and monitor stock levels for items stored at this location.
              </p>
            </label>

            <label className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition ${
              formData.type === "Warehouse" 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="radio"
                  name="type"
                  value="Warehouse"
                  checked={formData.type === "Warehouse"}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-900">Warehouse Only Location</span>
              </div>
              <p className="text-xs text-gray-600 ml-7">
                A Warehouse Only Location refers to where your items are stored. It helps track and monitor stock levels for items stored at this location.
              </p>
            </label>
          </div>
        </div>

        {/* Logo Field - Only show for Business Location */}
        {formData.type === "Business" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">Logo</label>
              <div className="col-span-2 space-y-4">
              {/* Logo Dropdown */}
              <div className="relative" ref={logoDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLogoDropdownOpen(!isLogoDropdownOpen)}
                  className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between bg-white"
                >
                  <span>{formData.logo}</span>
                  {isLogoDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </button>

                {isLogoDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => handleLogoOptionSelect("Same as Organization Logo")}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          formData.logo === "Same as Organization Logo" ? "bg-blue-50" : ""
                        }`}
                      >
                        <span>Same as Organization Logo</span>
                        {formData.logo === "Same as Organization Logo" && (
                          <Check size={16} className="text-blue-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLogoOptionSelect("Upload a New Logo")}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                          formData.logo === "Upload a New Logo" ? "bg-blue-50" : ""
                        }`}
                      >
                        <span>Upload a New Logo</span>
                        {formData.logo === "Upload a New Logo" && (
                          <Check size={16} className="text-blue-600" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo Upload Area - Show when "Upload a New Logo" is selected */}
              {formData.logo === "Upload a New Logo" && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div 
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition relative bg-gray-50 p-8"
                    onClick={handleLogoClick}
                  >
                    {logoPreview ? (
                      <>
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="max-w-full max-h-48 object-contain mb-2"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLogo();
                          }}
                          className="mt-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                        >
                          Remove Logo
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Upload your Location Logo</p>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>This logo will be displayed in transaction PDFs and email notifications.</p>
                    <p>Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI</p>
                    <p>Supported Files: jpg, jpeg, png, gif, bmp</p>
                    <p>Maximum File Size: 1MB</p>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Name Field */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-3 gap-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Name<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="col-span-2 space-y-3">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Location Name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {/* Only show checkbox for Business Location */}
              {formData.type === "Business" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isChildLocation"
                    checked={formData.isChildLocation}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">This is a Child Location</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Parent Location Field - Show for Warehouse or Business Location when checkbox is checked */}
        {(formData.type === "Warehouse" || (formData.type === "Business" && formData.isChildLocation)) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                Parent Location<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="col-span-2 relative" ref={parentLocationDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsParentLocationDropdownOpen(!isParentLocationDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between bg-white"
                >
                  <span className={selectedParentLocation ? "text-gray-900" : "text-gray-500"}>
                    {selectedParentLocation ? selectedParentLocation.name : "Select Location"}
                  </span>
                  {isParentLocationDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </button>

                {isParentLocationDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                      <div className="relative">
                        <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={parentLocationSearch}
                          onChange={(e) => setParentLocationSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      {filteredParentLocations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                      ) : (
                        filteredParentLocations.map((location) => (
                          <button
                            key={location._id}
                            type="button"
                            onClick={() => handleParentLocationSelect(location._id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                              formData.parentLocation === location._id ? "bg-blue-50" : ""
                            }`}
                          >
                            <span>{location.name}</span>
                            {formData.parentLocation === location._id && (
                              <Check size={16} className="text-blue-600" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Address</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">Attention</label>
              <input
                type="text"
                name="address.attention"
                value={formData.address.attention}
                onChange={handleChange}
                placeholder="Attention"
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">Street 1</label>
              <input
                type="text"
                name="address.street1"
                value={formData.address.street1}
                onChange={handleChange}
                placeholder="Street 1"
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">Street 2</label>
              <input
                type="text"
                name="address.street2"
                value={formData.address.street2}
                onChange={handleChange}
                placeholder="Street 2"
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">City</label>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  placeholder="ZIP/Postal Code"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">Country</label>
              <select
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="India">India</option>
                <option value="Kenya">Kenya</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">State/Province</label>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  placeholder="State/Province"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="text"
                  name="address.phone"
                  value={formData.address.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="text-sm font-medium text-gray-700">Fax Number</label>
              <input
                type="text"
                name="address.fax"
                value={formData.address.fax}
                onChange={handleChange}
                placeholder="Fax Number"
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Website URL - Show for both Business and Warehouse */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Website URL</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="Website URL"
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Primary Contact - Show for both Business and Warehouse */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Primary Contact
            </label>
            <select
              name="primaryContact"
              value={formData.primaryContact}
              onChange={handleChange}
              className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Primary Contact</option>
              {users.map((user) => (
                <option key={user._id || user.id} value={user._id || user.id}>
                  {user.name || `${user.firstName} ${user.lastName}`} &lt;{user.email}&gt;
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction Number Series - Only show for Business Location */}
        {formData.type === "Business" && (
          <>
            {/* Transaction Number Series */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  Transaction Number Series<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="col-span-2 relative" ref={transactionSeriesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTransactionSeriesDropdownOpen(!isTransactionSeriesDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between bg-white"
                  >
                    <span className={formData.transactionSeries ? "text-gray-900" : "text-gray-500"}>
                      {formData.transactionSeries || "Add Transaction Series"}
                    </span>
                    {isTransactionSeriesDropdownOpen ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </button>

                  {isTransactionSeriesDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={transactionSeriesSearch}
                            onChange={(e) => setTransactionSeriesSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="py-1">
                        {filteredTransactionSeries.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                        ) : (
                          filteredTransactionSeries.map((series, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleTransactionSeriesSelect(series)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                                formData.transactionSeries === series ? "bg-blue-50" : ""
                              }`}
                            >
                              <span>{series}</span>
                              {formData.transactionSeries === series && (
                                <Check size={16} className="text-blue-600" />
                              )}
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={handleAddTransactionSeries}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600 border-t border-gray-200 mt-1 pt-2"
                        >
                          <Plus size={16} className="text-blue-600" />
                          <span>Add Transaction Series</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Default Transaction Number Series */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  Default Transaction Number Series<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="col-span-2 relative" ref={defaultTransactionSeriesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDefaultTransactionSeriesDropdownOpen(!isDefaultTransactionSeriesDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between bg-white"
                  >
                    <span className={formData.defaultTransactionSeries ? "text-gray-900" : "text-gray-500"}>
                      {formData.defaultTransactionSeries || "Default Transaction Series"}
                    </span>
                    {isDefaultTransactionSeriesDropdownOpen ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </button>

                  {isDefaultTransactionSeriesDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={defaultTransactionSeriesSearch}
                            onChange={(e) => setDefaultTransactionSeriesSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="py-1">
                        {filteredDefaultTransactionSeries.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                        ) : (
                          filteredDefaultTransactionSeries.map((series, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleDefaultTransactionSeriesSelect(series)}
                              className={`w-full px-3 py-2 text-left text-sm rounded-lg transition ${
                                formData.defaultTransactionSeries === series 
                                  ? "bg-blue-500 text-white font-medium" 
                                  : "hover:bg-gray-50"
                              } flex items-center justify-between`}
                            >
                              <span>{series}</span>
                              {formData.defaultTransactionSeries === series && (
                                <Check size={16} className="text-white" />
                              )}
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={handleAddTransactionSeries}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600 border-t border-gray-200 mt-1 pt-2"
                        >
                          <Plus size={16} className="text-blue-600" />
                          <span>Add Transaction Series</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Location Access - Show for both Business and Warehouse */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-3 gap-4">
            <label className="text-sm font-medium text-gray-700">Location Access</label>
            <div className="col-span-2">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {formData.locationAccess.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 mb-2">No users selected</p>
                    <p className="text-xs text-gray-600 mb-4">
                      Select the users who can create and access transactions for this location.
                    </p>
                    <div className="flex items-center justify-end mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={provideAccessToAll}
                          onChange={(e) => setProvideAccessToAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Provide access to all users</span>
                      </label>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">USERS</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">ROLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-3">
                            <div className="relative" ref={userDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center justify-between bg-white"
                              >
                                <span className="text-gray-500">Select users</span>
                                <ChevronDown size={16} className="text-gray-500" />
                              </button>

                              {isUserDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                                    <div className="relative">
                                      <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                  <div className="py-1">
                                    {filteredUsers.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-gray-500 text-center">NO RESULTS FOUND</div>
                                    ) : (
                                      filteredUsers.map((user) => (
                                        <button
                                          key={user._id || user.id}
                                          type="button"
                                          onClick={() => handleUserSelect(user._id || user.id)}
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                              {(user.name || '').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">{user.name}</div>
                                              <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                              <option>User's Role</option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      â€¢ {formData.locationAccess.length} user(s) selected
                    </p>
                    <p className="text-xs text-gray-600 mb-4">
                      Selected users can create and access transactions for this location.
                    </p>
                    
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">USERS</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">ROLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.locationAccess.map((access, index) => {
                          const user = allUsers.find(u => (u._id || u.id) === access.userId) || users.find(u => (u._id || u.id) === access.userId);
                          return (
                            <tr 
                              key={index} 
                              className="border-b border-gray-200 group hover:bg-gray-50"
                            >
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {(user?.name || user?.firstName || access.userName || '').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{access.userName || user?.name || `${user?.firstName} ${user?.lastName}`}</div>
                                    <div className="text-xs text-gray-500">{access.userEmail || user?.email}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(access.userId)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
                                  >
                                    <X size={14} className="text-white" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-gray-700">{access.role || user?.role || "Admin"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Updating...' : 'Update'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


