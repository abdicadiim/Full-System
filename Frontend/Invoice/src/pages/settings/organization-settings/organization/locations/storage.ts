const LS_LOCATIONS_ENABLED_KEY = "taban_locations_enabled";
const LS_LOCATIONS_CACHE_KEY = "taban_locations_cache";

const buildDemoLocations = () => {
  const now = new Date().toISOString();
  return [
    {
      _id: "loc-head-office",
      id: "loc-head-office",
      name: "Head Office",
      type: "Business",
      isActive: true,
      isDefault: true,
      defaultTransactionSeries: "Default Transaction Series",
      parentLocation: null,
      address: {
        attention: "",
        street1: "Kampala Road",
        street2: "",
        city: "Kampala",
        zipCode: "",
        country: "Uganda",
        state: "Central Region",
        phone: "+256700000001",
        fax: "",
      },
      contactPerson: {
        name: "Admin User",
        email: "admin@example.com",
        phone: "+256700000001",
      },
      notes: "Website: https://taban.demo",
      logo: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: "loc-main-warehouse",
      id: "loc-main-warehouse",
      name: "Main Warehouse",
      type: "Warehouse",
      isActive: true,
      isDefault: false,
      defaultTransactionSeries: "Warehouse Series",
      parentLocation: "loc-head-office",
      address: {
        attention: "",
        street1: "Industrial Area",
        street2: "",
        city: "Kampala",
        zipCode: "",
        country: "Uganda",
        state: "Central Region",
        phone: "+256700000002",
        fax: "",
      },
      contactPerson: {
        name: "Warehouse Manager",
        email: "warehouse@example.com",
        phone: "+256700000002",
      },
      notes: "",
      logo: "",
      createdAt: now,
      updatedAt: now,
    },
  ];
};

const readJsonArray = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const readLocationsEnabled = () => {
  try {
    return localStorage.getItem(LS_LOCATIONS_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
};

export const writeLocationsEnabled = (value: boolean) => {
  try {
    localStorage.setItem(LS_LOCATIONS_ENABLED_KEY, String(Boolean(value)));
  } catch {
    // no-op
  }
};

export const ensureDemoLocations = () => {
  const existing = readJsonArray(LS_LOCATIONS_CACHE_KEY);
  if (existing.length > 0) {
    return existing;
  }
  const demo = buildDemoLocations();
  try {
    localStorage.setItem(LS_LOCATIONS_CACHE_KEY, JSON.stringify(demo));
  } catch {
    // no-op
  }
  return demo;
};

export const readLocations = () => {
  const rows = readJsonArray(LS_LOCATIONS_CACHE_KEY);
  return rows.length > 0 ? rows : ensureDemoLocations();
};

export const writeLocations = (rows: any[]) => {
  try {
    localStorage.setItem(LS_LOCATIONS_CACHE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {
    // no-op
  }
};

export const getLocationById = (id: string) =>
  readLocations().find((row: any) => String(row?._id || row?.id) === String(id)) || null;

export const getDemoUsers = (currentUser?: any) => {
  const primaryUser = currentUser
    ? {
        _id: currentUser.id,
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role || "Admin",
      }
    : {
        _id: "demo-admin",
        id: "demo-admin",
        name: "Admin User",
        email: "admin@example.com",
        role: "Admin",
      };

  return [
    primaryUser,
    {
      _id: "demo-warehouse",
      id: "demo-warehouse",
      name: "Warehouse Manager",
      email: "warehouse@example.com",
      role: "Staff",
    },
    {
      _id: "demo-sales",
      id: "demo-sales",
      name: "Sales Lead",
      email: "sales@example.com",
      role: "Manager",
    },
  ];
};

export { LS_LOCATIONS_CACHE_KEY, LS_LOCATIONS_ENABLED_KEY };
