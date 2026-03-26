import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ChevronDown, Pencil, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";

import DatePicker from "../../components/DatePicker";
import { chartOfAccountsAPI, currenciesAPI, settingsAPI } from "../../services/api";

type MileageRateRow = {
  id: string;
  startDate: string;
  rate: string;
  isEditing?: boolean;
  isNew?: boolean;
  draftStartDate?: string;
  draftRate?: string;
};

const createMileageRateId = () => `mileage-rate-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const createMileageRateRow = (overrides: Partial<MileageRateRow> = {}): MileageRateRow => ({
  id: overrides.id || createMileageRateId(),
  startDate: String(overrides.startDate ?? ""),
  rate: String(overrides.rate ?? ""),
  isEditing: overrides.isEditing ?? false,
  isNew: overrides.isNew ?? false,
  draftStartDate: String(overrides.draftStartDate ?? overrides.startDate ?? ""),
  draftRate: String(overrides.draftRate ?? overrides.rate ?? ""),
});
const createBlankMileageRateRow = (): MileageRateRow => createMileageRateRow({
  isEditing: true,
  isNew: true,
  startDate: "",
  rate: "",
  draftStartDate: "",
  draftRate: "",
});
const normalizeMileageRateRows = (rows: MileageRateRow[]) =>
  rows
    .map((row) => ({
      startDate: String(row.isEditing ? row.draftStartDate ?? "" : row.startDate ?? "").trim(),
      rate: String(row.isEditing ? row.draftRate ?? "" : row.rate ?? "").trim(),
    }))
    .filter((row) => row.startDate || row.rate);
const hydrateMileageRateRows = (rows: any[]) => {
  const mapped = rows
    .map((row: any) =>
      createMileageRateRow({
        startDate: String(row?.startDate || ""),
        rate: String(row?.rate || ""),
        isEditing: false,
        isNew: false,
      })
    )
    .filter((row) => row.startDate || row.rate);

  return mapped.length > 0 ? mapped : [createBlankMileageRateRow()];
};
const formatMileageRateDate = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
    }
  }
  return trimmed;
};
const normalizeMileageRateDateKey = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    const parsed = new Date(direct.getFullYear(), direct.getMonth(), direct.getDate());
    return String(parsed.getTime());
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) {
      return String(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime());
    }
  }

  const labelMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (labelMatch) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const monthIndex = months[labelMatch[2].toLowerCase()];
    if (monthIndex !== undefined) {
      const parsed = new Date(Number(labelMatch[3]), monthIndex, Number(labelMatch[1]));
      if (!Number.isNaN(parsed.getTime())) {
        return String(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime());
      }
    }
  }

  return trimmed.toLowerCase();
};
const hasDuplicateMileageRateDates = (rows: Array<{ startDate: string }>) => {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = normalizeMileageRateDateKey(row.startDate);
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
};
const FALLBACK_MILEAGE_ACCOUNTS = [
  "Office Supplies",
  "Advertising And Marketing",
  "Bank Fees and Charges",
  "Credit Card Charges",
  "Travel Expense",
  "Telephone Expense",
  "Automobile Expense",
  "IT and Internet Expenses",
  "Rent Expense",
  "Janitorial Expense",
  "Postage",
  "Bad Debt",
  "Printing and Stationery",
  "Salaries and Employee Wages",
  "Meals and Entertainment",
  "Depreciation Expense",
  "Consultant Expense",
  "Repairs and Maintenance",
  "Other Expenses",
  "Lodging",
  "Purchase Discounts",
  "Fuel/Mileage Expenses",
];

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("preferences");
  const mileageAccountMenuRef = useRef<HTMLDivElement | null>(null);
  
  // Preferences tab states
  const [mileageAccountRows, setMileageAccountRows] = useState<string[]>([]);
  const [mileageDefaultAccount, setMileageDefaultAccount] = useState("Automobile Expense");
  const [mileageDefaultUnit, setMileageDefaultUnit] = useState<"Km" | "Mile(s)">("Km");
  const [mileageRates, setMileageRates] = useState<MileageRateRow[]>([createBlankMileageRateRow()]);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState("USD");
  const [isMileageAccountOpen, setIsMileageAccountOpen] = useState(false);
  const [mileageValidationError, setMileageValidationError] = useState("");
  const [deleteMileageRateId, setDeleteMileageRateId] = useState<string | null>(null);
  
  // Field Customization tab states
  const [customFields, setCustomFields] = useState([]);
  const customFieldsUsage = customFields.length;
  const maxCustomFields = 59;
  
  // Custom Buttons tab states
  const [customButtons, setCustomButtons] = useState([]);
  const [locationFilter, setLocationFilter] = useState("All");
  const [showNewButtonModal, setShowNewButtonModal] = useState(false);
  const [newButtonName, setNewButtonName] = useState("");
  const [newButtonType, setNewButtonType] = useState("");
  
  // Related Lists tab states
  const [relatedLists, setRelatedLists] = useState([]);

  useEffect(() => {
    const loadMileageSettings = async () => {
      try {
        const [profileRes, accountsRes, baseCurrencyRes] = await Promise.all([
          settingsAPI.getOrganizationProfile(),
          chartOfAccountsAPI.getAccounts({ isActive: true }),
          currenciesAPI.getBaseCurrency(),
        ]);

        const prefs = profileRes?.data?.mileagePreferences;
        setBaseCurrencyCode(
          String(
            baseCurrencyRes?.data?.code ||
              baseCurrencyRes?.data?.currency_code ||
              profileRes?.data?.baseCurrency ||
              "USD"
          )
            .trim()
            .toUpperCase() || "USD"
        );
        if (prefs && typeof prefs === "object") {
          setMileageDefaultAccount(String(prefs.defaultMileageAccount || "Automobile Expense"));
          setMileageDefaultUnit(
            prefs.defaultUnit === "Mile" || prefs.defaultUnit === "Mile(s)" ? "Mile(s)" : "Km"
          );
          const rows = Array.isArray(prefs.mileageRates) ? prefs.mileageRates : [];
          setMileageRates(hydrateMileageRateRows(rows));
        } else {
          try {
            const raw = localStorage.getItem("taban_mileage_preferences_v1");
            const stored = raw ? JSON.parse(raw) : null;
            if (stored && typeof stored === "object") {
              setMileageDefaultAccount(String(stored.defaultMileageAccount || "Automobile Expense"));
              setMileageDefaultUnit(
                stored.defaultUnit === "Mile" || stored.defaultUnit === "Mile(s)" ? "Mile(s)" : "Km"
              );
              const rows = Array.isArray(stored.mileageRates) ? stored.mileageRates : [];
              setMileageRates(hydrateMileageRateRows(rows));
            }
          } catch {
            // ignore fallback parsing errors
          }
        }

        if (accountsRes?.success && Array.isArray(accountsRes?.data)) {
          const fromApi = accountsRes.data
            .filter((account: any) => {
              const type = String(account?.accountType || "").toLowerCase();
              return account?.isActive !== false && (
                type.includes("expense") ||
                type === "cost_of_goods_sold" ||
                type === "other_expense"
              );
            })
            .map((account: any) => String(account?.accountName || "").trim())
            .filter(Boolean);
          setMileageAccountRows(fromApi);
        }
      } catch (error) {
        console.error("Error loading mileage settings:", error);
      }
    };

    loadMileageSettings();
  }, []);

  const mileageAccountOptions = useMemo(() => {
    const unique = Array.from(new Set([...mileageAccountRows, ...FALLBACK_MILEAGE_ACCOUNTS]));
    return unique.length > 0 ? unique : FALLBACK_MILEAGE_ACCOUNTS;
  }, [mileageAccountRows]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (mileageAccountMenuRef.current && !mileageAccountMenuRef.current.contains(event.target as Node)) {
        setIsMileageAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const updateMileageRateRow = (index: number, patch: Partial<MileageRateRow>) => {
    setMileageValidationError("");
    setMileageRates((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const handleEditMileageRate = (index: number) => {
    setMileageValidationError("");
    setMileageRates((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              isEditing: true,
              draftStartDate: row.startDate,
              draftRate: row.rate,
            }
          : row
      )
    );
  };

  const handleCancelMileageRateEdit = (index: number) => {
    setMileageValidationError("");
    setMileageRates((prev) => {
      const current = prev[index];
      if (!current) return prev;
      if (current.isNew) {
        const next = prev.filter((_, rowIndex) => rowIndex !== index);
        return next.length > 0 ? next : [createBlankMileageRateRow()];
      }
      return prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              isEditing: false,
              isNew: false,
              draftStartDate: "",
              draftRate: "",
            }
          : row
      );
    });
  };

  const confirmDeleteMileageRate = () => {
    if (!deleteMileageRateId) return;
    const nextRates = mileageRates.filter((row) => row.id !== deleteMileageRateId);
    setDeleteMileageRateId(null);
    void persistMileagePreferences(
      nextRates.length > 0 ? nextRates : [createBlankMileageRateRow()],
      "Mileage rate deleted"
    );
  };

  const persistMileagePreferences = async (rows: MileageRateRow[], successMessage: string) => {
    const persistedRates = normalizeMileageRateRows(rows);
    if (hasDuplicateMileageRateDates(persistedRates)) {
      setMileageValidationError("Mileage rate already exists with this date");
      return false;
    }
    const savedPreferences = {
      defaultMileageAccount: mileageDefaultAccount,
      defaultUnit: mileageDefaultUnit,
      mileageRates: persistedRates,
    };

    try {
      localStorage.setItem("mileage_preferences_set", "true");
      localStorage.setItem("taban_mileage_preferences_v1", JSON.stringify(savedPreferences));
      await settingsAPI.updateOrganizationProfile({ mileagePreferences: savedPreferences });
      setMileageRates(
        persistedRates.length > 0
          ? persistedRates.map((row) =>
              createMileageRateRow({
                startDate: row.startDate,
                rate: row.rate,
                isEditing: false,
                isNew: false,
              })
            )
          : [createBlankMileageRateRow()]
      );
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error("Error saving mileage preferences:", error);
      toast.error("Could not save mileage preferences");
      return false;
    }
  };

  const saveMileagePreferences = async () => {
    await persistMileagePreferences(mileageRates, "Mileage preferences saved");
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Expenses</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "preferences"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab("field-customization")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "field-customization"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Field Customization
        </button>
        <button
          onClick={() => setActiveTab("custom-buttons")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "custom-buttons"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Custom Buttons
        </button>
        <button
          onClick={() => setActiveTab("related-lists")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "related-lists"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Related Lists
        </button>
      </div>

      {/* Preferences Tab Content */}
      {activeTab === "preferences" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="pt-4 border-t border-gray-200">
            {mileageValidationError ? (
              <div
                role="alert"
                className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3"
              >
                <span>{mileageValidationError}</span>
                <button
                  type="button"
                  onClick={() => setMileageValidationError("")}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Dismiss mileage validation error"
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Mileage Preferences</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="w-48 text-sm text-gray-700">Default Mileage Account</label>
                <div ref={mileageAccountMenuRef} className="relative flex-1 max-w-md">
                  <button
                    type="button"
                    onClick={() => setIsMileageAccountOpen((prev) => !prev)}
                    className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 text-sm text-left focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{mileageDefaultAccount || "Select mileage account"}</span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${isMileageAccountOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isMileageAccountOpen && (
                    <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg z-30 overflow-hidden">
                      <div className="max-h-[180px] overflow-y-auto py-1">
                        {mileageAccountOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setMileageDefaultAccount(opt);
                              setIsMileageAccountOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                              mileageDefaultAccount === opt ? "bg-gray-100 text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-48 text-sm text-gray-700">Default Unit</label>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mileageDefaultUnit === "Km"}
                      onChange={() => setMileageDefaultUnit("Km")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Km</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mileageDefaultUnit === "Mile(s)"}
                      onChange={() => setMileageDefaultUnit("Mile(s)")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Mile</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Mileage Rates</div>
                <p className="text-sm text-gray-500 max-w-3xl mb-4">
                  Any mileage expense recorded on or after the start date will use the corresponding mileage rate.
                  Leave the start date blank to define a default rate.
                </p>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-4 py-3 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase">
                    <div>Start Date</div>
                    <div>Mileage Rate</div>
                    <div></div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {mileageRates.map((row, index) => (
                      <div
                        key={row.id}
                        className={`group grid grid-cols-[1fr_1fr_120px] gap-3 items-center px-4 py-3 transition ${
                          row.isEditing ? "bg-gray-50" : "hover:bg-gray-50"
                        }`}
                      >
                        {row.isEditing ? (
                          <DatePicker
                            value={row.draftStartDate ?? row.startDate}
                            onChange={(e) =>
                              updateMileageRateRow(index, {
                                draftStartDate: e,
                                isEditing: true,
                              })
                            }
                            placeholder="dd/mm/yyyy"
                            className="h-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">{formatMileageRateDate(row.startDate)}</div>
                        )}

                        {row.isEditing ? (
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-10 focus-within:ring-2 focus-within:ring-teal-600">
                            <span className="bg-gray-50 px-3 text-sm text-gray-600 border-r border-gray-300 h-full flex items-center">
                              {baseCurrencyCode}
                            </span>
                            <input
                              value={row.draftRate ?? row.rate}
                              onChange={(e) =>
                                updateMileageRateRow(index, {
                                  draftRate: e.target.value,
                                  isEditing: true,
                                })
                              }
                              className="flex-1 px-3 text-sm outline-none h-full"
                              placeholder="0.00"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {baseCurrencyCode} {row.rate}
                          </div>
                        )}

                        {row.isEditing ? (
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleCancelMileageRateEdit(index)}
                              className="text-blue-600 text-sm font-medium hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label="Edit mileage rate"
                              onClick={() => handleEditMileageRate(index)}
                              className="text-gray-400 hover:text-teal-600"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete mileage rate"
                              onClick={() => setDeleteMileageRateId(row.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMileageValidationError("");
                    setMileageRates((prev) => [...prev, createBlankMileageRateRow()]);
                  }}
                  className="mt-3 text-teal-700 text-sm font-medium hover:text-teal-800 flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span>
                  Add Mileage Rate
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-start pt-6 border-t border-gray-200">
            <button
              onClick={saveMileagePreferences}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {deleteMileageRateId !== null && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-12">
          <div className="w-full max-w-[460px] rounded-lg bg-white shadow-xl">
            <div className="flex items-start gap-3 px-6 py-5">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <Lock size={18} />
              </div>
              <div className="pt-1 text-sm text-gray-700">Are you sure about deleting this mileage rate?</div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3">
              <button
                type="button"
                onClick={confirmDeleteMileageRate}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                Delete it
              </button>
              <button
                type="button"
                onClick={() => setDeleteMileageRateId(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Customization Tab Content */}
      {activeTab === "field-customization" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Custom Fields Usage: {customFieldsUsage}/{maxCustomFields}
            </div>
            <button
              onClick={() => navigate("/settings/expenses/new-field")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Custom Field
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                      </p>
                    </td>
                  </tr>
                ) : (
                  customFields.map((field, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        {field.name}
                        {field.locked && <Lock size={14} className="text-gray-400" />}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.dataType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{field.mandatory}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.status === "Active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {field.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Buttons Tab Content */}
      {activeTab === "custom-buttons" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                What's this?
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                View Logs
              </button>
              <button
                onClick={() => setShowNewButtonModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                New
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Location :</label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-9 px-3 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="All">All</option>
                  <option value="Details Page Menu">Details Page Menu</option>
                  <option value="List Page - Action Menu">List Page - Action Menu</option>
                  <option value="List Page - Bulk Action Menu">List Page - Bulk Action Menu</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">BUTTON NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ACCESS PERMISSION</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LOCATION</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customButtons.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        Create buttons which perform actions set by you. What are you waiting for!
                      </p>
                    </td>
                  </tr>
                ) : (
                  customButtons.map((button, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{button.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.accessPermission}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{button.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related Lists Tab Content */}
      {activeTab === "related-lists" && (
        <div>
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => navigate("/settings/expenses/new-related-list")}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              New Related List
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-8 flex items-center justify-center" style={{ width: "200px", height: "200px" }}>
                <div 
                  className="absolute rounded-lg border-2 border-gray-300 bg-gray-50"
                  style={{
                    width: "120px",
                    height: "100px",
                    transform: "rotate(-2deg)",
                    left: "60px",
                    top: "30px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                  }}
                >
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2">
                    <div className="w-full h-px bg-gray-300 mb-2"></div>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-center items-center">
                    <div className="h-full w-px bg-gray-300"></div>
                  </div>
                </div>
                
                <div className="relative z-10" style={{ left: "-20px", top: "10px" }}>
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#fbbf24",
                      top: "0px",
                      left: "15px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    <div 
                      className="absolute rounded-full bg-white"
                      style={{
                        width: "35px",
                        height: "35px",
                        top: "8px",
                        left: "7.5px"
                      }}
                    >
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-700 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div 
                    className="absolute rounded-lg"
                    style={{
                      width: "60px",
                      height: "70px",
                      backgroundColor: "#ef4444",
                      top: "45px",
                      left: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  ></div>
                  
                  <div 
                    className="absolute rounded-full border-4 border-blue-500 bg-blue-100"
                    style={{
                      width: "50px",
                      height: "50px",
                      top: "60px",
                      left: "50px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-white"></div>
                      <div className="absolute w-0.5 h-6 bg-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center mb-8 max-w-md">
                Create custom related lists to access relevant information available from inside or outside the application.
              </p>

              <button
                onClick={() => navigate("/settings/expenses/new-related-list")}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                New Related List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Custom Button Modal */}
      {showNewButtonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Custom Button - Expenses</h2>
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Button Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newButtonName}
                  onChange={(e) => setNewButtonName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter button name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Type
                </label>
                <select
                  value={newButtonType}
                  onChange={(e) => setNewButtonType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Select</option>
                  <option value="workflow">Workflow</option>
                  <option value="script">Script</option>
                  <option value="url">URL</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewButtonModal(false);
                  setNewButtonName("");
                  setNewButtonType("");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

