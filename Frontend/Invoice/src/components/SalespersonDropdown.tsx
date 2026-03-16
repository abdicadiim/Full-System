import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { API_BASE_URL, getToken } from "../services/auth";

const SALESPERSONS_STORAGE_KEY = "taban_books_salespersons";

type Salesperson = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  status?: string;
};

const readSalespersonsFromStorage = (): Salesperson[] => {
  try {
    const raw = localStorage.getItem(SALESPERSONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSalespersonsToStorage = (rows: Salesperson[]) => {
  try {
    localStorage.setItem(SALESPERSONS_STORAGE_KEY, JSON.stringify(rows || []));
  } catch {
    // ignore
  }
};

const normalizeSalesperson = (sp: any): Salesperson => {
  const id = String(sp?._id || sp?.id || sp?.name || "").trim();
  return {
    ...sp,
    id: id || sp?.id,
    _id: sp?._id || id,
    name: String(sp?.name || sp?.displayName || sp?.fullName || "").trim() || "Unknown",
    email: String(sp?.email || "").trim(),
    status: String(sp?.status || "active").trim()
  };
};

const SalespersonDropdown = ({ value, onChange, placeholder = "Select or Add Salesperson" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [salespersons, setSalespersons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Always load local cache first (no-auth friendly).
    const cached = readSalespersonsFromStorage().map(normalizeSalesperson);
    if (cached.length > 0) {
      setSalespersons(cached as any);
    }
    fetchSalespersons();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setIsCreating(false);
        setNewName('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchSalespersons = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/salespersons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const rows = (Array.isArray(data) ? data : (data.salespersons || [])).map(normalizeSalesperson);
        setSalespersons(rows as any);
        writeSalespersonsToStorage(rows);
      } else {
        // If unauthorized/offline, keep local cache and avoid console noise.
        if (response.status === 401) return;
      }
    } catch (error) {
      console.error('Error fetching salespersons:', error);
      // Fallback: keep local cache
    }
  };

  const filteredSalespersons = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return (salespersons || []).filter((sp: any) =>
      String(sp?.name || "").toLowerCase().includes(query) ||
      String(sp?.email || "").toLowerCase().includes(query)
    );
  }, [salespersons, searchTerm]);

  const handleSelect = (salesperson) => {
    onChange(salesperson._id || salesperson.id || salesperson.name, salesperson);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      const token = getToken();
      if (token) {
        const response = await fetch(`${API_BASE_URL}/salespersons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newName.trim() })
        });

        if (response.ok) {
          const newSalesperson = normalizeSalesperson(await response.json());
          setSalespersons((prev: any) => {
            const next = [newSalesperson, ...(prev || [])];
            writeSalespersonsToStorage(next);
            return next;
          });
          handleSelect(newSalesperson);
          setNewName('');
          setIsCreating(false);
          return;
        }
      }

      // Fallback: create locally
      const newSalesperson = normalizeSalesperson({ id: Date.now().toString(), name: newName.trim(), status: "active", email: "" });
      setSalespersons((prev: any) => {
        const next = [newSalesperson, ...(prev || [])];
        writeSalespersonsToStorage(next);
        return next;
      });
      handleSelect(newSalesperson);
      setNewName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating salesperson:', error);
      // Fallback: create locally
      const newSalesperson = normalizeSalesperson({ id: Date.now().toString(), name: newName.trim(), status: "active", email: "" });
      setSalespersons((prev: any) => {
        const next = [newSalesperson, ...(prev || [])];
        writeSalespersonsToStorage(next);
        return next;
      });
      handleSelect(newSalesperson);
      setNewName('');
      setIsCreating(false);
    }
  };

  const selectedSalesperson = salespersons.find(sp => 
    (sp._id || sp.id || sp.name) === value
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white flex items-center justify-between"
      >
        <span className={selectedSalesperson ? 'text-gray-900' : 'text-gray-500'}>
          {selectedSalesperson ? selectedSalesperson.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {!isCreating ? (
            <>
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search salespersons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="py-1">
                {filteredSalespersons.length === 0 && searchTerm ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No salespersons found. Press Enter to create "{searchTerm}"
                  </div>
                ) : (
                  filteredSalespersons.map((salesperson) => (
                    <button
                      key={salesperson._id || salesperson.id || salesperson.name}
                      onClick={() => handleSelect(salesperson)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{salesperson.name}</div>
                      {salesperson.email && (
                        <div className="text-xs text-gray-500">{salesperson.email}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setSearchTerm('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-4 h-4" />
                  Add New Salesperson
                </button>
              </div>
            </>
          ) : (
            <div className="p-3">
              <input
                type="text"
                placeholder="Enter salesperson name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  } else if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewName('');
                  }
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewName('');
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalespersonDropdown;
