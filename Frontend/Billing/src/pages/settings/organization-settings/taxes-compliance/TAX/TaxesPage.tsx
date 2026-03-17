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

    const isListView = !location.pathname.includes("/new") && 
                       !location.pathname.includes("/bulk") && 
                       !location.pathname.includes("/import") && 
                       !location.pathname.includes("/detail");
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
        <div className="p-0 bg-white">
            <div className="flex items-stretch min-h-[calc(100vh-76px)]">
                {/* Vertical Navigation - Only show when on list or settings */}
                {isListView && (
                    <div className="w-52 shrink-0 flex flex-col border-r border-gray-200 bg-white">
                        <div className="px-6 py-6 text-xl font-semibold text-gray-900">
                            Taxes
                        </div>
                        <div className="flex flex-col">
                            <button
                                onClick={() => navigate("/settings/taxes")}
                                className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === "tax-rates"
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                Tax Rates
                            </button>
                            {isTDSEnabled && (
                                <button
                                    onClick={() => navigate("/settings/taxes/tds-rates")}
                                    className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === "tds-rates"
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    TDS Rates
                                </button>
                            )}
                            <button
                                onClick={() => navigate("/settings/taxes/tax-settings")}
                                className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === "tax-settings"
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                Tax Settings
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 min-w-0 px-4 pt-8">
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
            </div>
        </div>
    );
}


