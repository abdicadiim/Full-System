import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CurrenciesPage from "./CurrenciesPage";
import CurrencyExchangeRatesPage from "./CurrencyExchangeRatesPage";
import ImportExchangeRates from "./ImportExchangeRates";
import ExportExchangeRatesPage from "./ExportExchangeRatesPage";

export default function CurrenciesRouter() {
    return (
        <Routes>
            <Route path="/" element={<CurrenciesPage />} />
            <Route path="import" element={<ImportExchangeRates />} />
            <Route path="export" element={<ExportExchangeRatesPage />} />
            <Route path=":id/exchange-rates" element={<CurrencyExchangeRatesPage />} />
            <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
    );
}
