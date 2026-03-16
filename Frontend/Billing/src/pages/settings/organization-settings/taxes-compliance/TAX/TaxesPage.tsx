import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import TaxListPage from "./list/TaxListPage";
import NewTaxPage from "./new/NewTaxPage";
import NewTaxGroupPage from "./new/NewTaxGroupPage";
import TaxBulkPage from "./bulk/TaxBulkPage";
import TaxImportPage from "./import/TaxImportPage";
import TaxSettingsPage from "../tax-settings/TaxSettingsPage";
import TDSRatesPage from "./tds/TDSRatesPage";
import { readTaxComplianceSettingsLocal } from "./storage";

export default function TaxesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isTDSEnabled, setIsTDSEnabled] = useState(false);

    const getActiveTab = () => {
        if (location.pathname.includes("/tds-rates")) return "tds-rates";
        if (location.pathname.includes("/tax-settings")) return "tax-settings";
        return "tax-rates";
    };

    const activeTab = getActiveTab();

    useEffect(() => {
        const loadTDSState = () => {
            const enabled = !!readTaxComplianceSettingsLocal().enableTDS;
            setIsTDSEnabled(enabled);
            if (!enabled && location.pathname.includes("/tds-rates")) {
                navigate("/settings/taxes", { replace: true });
            }
        };

        loadTDSState();
        window.addEventListener("taban:tax-settings-storage-updated", loadTDSState);
        return () => window.removeEventListener("taban:tax-settings-storage-updated", loadTDSState);
    }, [location.pathname, navigate]);

    return (
        <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Taxes & Compliance</h1>
                {(location.pathname.includes("/new") || location.pathname.includes("/new-group")) && (
                    <>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-600">
                            {location.pathname.includes("/new-group") ? "New Tax Group" : "New Tax"}
                        </span>
                    </>
                )}
            </div>

            {/* Tabs - Only show when on list or settings */}
            {(!location.pathname.includes("/new") && !location.pathname.includes("/bulk") && !location.pathname.includes("/import") && !location.pathname.includes("/detail")) && (
                <div className="flex gap-4 border-b border-gray-200 mb-6">
                    <button
                        onClick={() => navigate("/settings/taxes")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === "tax-rates"
                                ? "border-[#156372] text-[#156372]"
                                : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        Tax Rates
                    </button>
                    {isTDSEnabled && (
                        <button
                            onClick={() => navigate("/settings/taxes/tds-rates")}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === "tds-rates"
                                    ? "border-[#156372] text-[#156372]"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            TDS Rates
                        </button>
                    )}
                    <button
                        onClick={() => navigate("/settings/taxes/tax-settings")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === "tax-settings"
                                ? "border-[#156372] text-[#156372]"
                                : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        Tax Settings
                    </button>
                </div>
            )}

            {/* Content Routes */}
            <Routes>
                <Route index element={<TaxListPage />} />
                <Route path="new" element={<NewTaxPage />} />
                <Route path="new-group" element={<NewTaxGroupPage />} />
                <Route path="new-group/:id" element={<NewTaxGroupPage />} />
                <Route path="create-bulk" element={<TaxBulkPage />} />
                <Route path="import" element={<TaxImportPage />} />
                <Route path="tax-settings" element={<TaxSettingsPage />} />
                <Route path="tds-rates" element={isTDSEnabled ? <TDSRatesPage /> : <Navigate to="/settings/taxes" replace />} />
                <Route path="detail/:id" element={<NewTaxPage />} />
                <Route path="*" element={<Navigate to="/settings/taxes" replace />} />
            </Routes>
        </div>
    );
}


