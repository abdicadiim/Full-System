import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import OpeningBalancesPage from "./OpeningBalancesPage";
import ImportAccountsReceivable from "./ImportAccountsReceivable";
import ImportAccountsPayable from "./ImportAccountsPayable";

export default function OpeningBalancesRouter() {
    return (
        <Routes>
            <Route path="/" element={<OpeningBalancesPage />} />
            <Route path="import-receivable" element={<ImportAccountsReceivable />} />
            <Route path="import-payable" element={<ImportAccountsPayable />} />
            <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
    );
}
