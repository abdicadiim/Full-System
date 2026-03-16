import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import AddExchangeRateModal from "./AddExchangeRateModal";

export default function CurrencyExchangeRatesPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currency, setCurrency] = useState<any>(null);
    const [baseCurrency, setBaseCurrency] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exchangeRates, setExchangeRates] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchData = () => {
        try {
            const stored = localStorage.getItem("taban_currencies");
            const allCurrenciesData = stored ? JSON.parse(stored) : [];

            const currencyData = allCurrenciesData.find((c: any) => c.id === id || c._id === id);

            if (currencyData) {
                setCurrency(currencyData);
                setExchangeRates(currencyData.exchangeRates || []);
            }

            if (allCurrenciesData.length > 0) {
                const base = allCurrenciesData.find((c: any) => c.isBase || c.isBaseCurrency);
                setBaseCurrency(base);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSaveExchangeRate = async (newRate: { date: string; rate: string }) => {
        try {
            const stored = localStorage.getItem("taban_currencies");
            const allCurrencies = stored ? JSON.parse(stored) : [];
            const idx = allCurrencies.findIndex((c: any) => c.id === id || c._id === id);

            if (idx >= 0) {
                const currencyToUpdate = allCurrencies[idx];
                const rates = currencyToUpdate.exchangeRates || [];
                const rateWithId = { ...newRate, _id: "rate_" + Date.now() + Math.random().toString(36).substring(2, 9) };
                rates.push(rateWithId);
                currencyToUpdate.exchangeRates = rates;

                allCurrencies[idx] = currencyToUpdate;
                localStorage.setItem("taban_currencies", JSON.stringify(allCurrencies));

                fetchData();
                setShowAddModal(false);
            } else {
                alert("Currency not found");
            }
        } catch (err) {
            console.error("Error adding exchange rate:", err);
            alert("Failed to add exchange rate");
        }
    };

    const handleDeleteExchangeRate = async (rateId: string) => {
        if (!rateId) return;

        const confirmed = window.confirm("Delete this exchange rate?");
        if (!confirmed) return;

        try {
            const stored = localStorage.getItem("taban_currencies");
            const allCurrencies = stored ? JSON.parse(stored) : [];
            const idx = allCurrencies.findIndex((c: any) => c.id === id || c._id === id);

            if (idx >= 0) {
                const currencyToUpdate = allCurrencies[idx];
                const rates = currencyToUpdate.exchangeRates || [];
                currencyToUpdate.exchangeRates = rates.filter((r: any) => r._id !== rateId);

                allCurrencies[idx] = currencyToUpdate;
                localStorage.setItem("taban_currencies", JSON.stringify(allCurrencies));

                fetchData();
            } else {
                throw new Error("Currency not found");
            }
        } catch (err: any) {
            console.error("Error deleting exchange rate:", err);
            alert(err.message || "Failed to delete exchange rate");
        }
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!currency) {
        return <div className="p-6">Currency not found</div>;
    }

    const sortedExchangeRates = [...exchangeRates].sort(
        (a: any, b: any) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
    );

    return (
        <div className="p-6">
            <button
                onClick={() => navigate("/settings/currencies")}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
            >
                <ChevronLeft size={16} className="mr-1" />
                Back to Currencies
            </button>

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {currency.code} - Exchange Rates
                </h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Exchange Rate
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        Enable Exchange Rate Feeds
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden min-h-[400px]">
                {sortedExchangeRates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                        <p className="text-gray-500">You have not specified any exchange rate for this currency</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">AS OF DATE</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">EXCHANGE RATE</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedExchangeRates.map((rate: any, index: number) => (
                                <tr key={rate?._id || index} className="group hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {new Date(rate.date).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric"
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {baseCurrency?.symbol}{Number(rate.rate || 0).toFixed(2)}
                                        {index === 0 && (
                                            <span className="ml-3 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-green-600 text-white">
                                                Current Rate
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            type="button"
                                            title="Delete exchange rate"
                                            onClick={() => handleDeleteExchangeRate(String(rate?._id || ""))}
                                            disabled={!rate?._id}
                                            className="inline-flex items-center justify-center text-gray-400 hover:text-red-600 disabled:opacity-30 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showAddModal && (
                <AddExchangeRateModal
                    currencyCode={currency.code}
                    baseCurrencyCode={baseCurrency?.code || "AUD"}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleSaveExchangeRate}
                />
            )}
        </div>
    );
}
