import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Info, Eye, EyeOff } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";

type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  isBaseCurrency: boolean;
  isActive: boolean;
  latestExchangeRate: number | null;
  asOfDate: string;
};

const toCsvCell = (value: any) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export default function ExportExchangeRatesPage() {
  const navigate = useNavigate();

  const [module, setModule] = useState("Currencies & Exchange Rates");
  const [decimalFormat, setDecimalFormat] = useState("1234567.89");
  const [fileFormat, setFileFormat] = useState("csv");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CurrencyRow[]>([]);

  useEffect(() => {
    const loadCurrencies = () => {
      try {
        const stored = localStorage.getItem("taban_currencies");
        const currenciesData = stored ? JSON.parse(stored) : [];

        const mappedRows: CurrencyRow[] = currenciesData.map((currency: any) => {
          const rates = Array.isArray(currency.exchangeRates) ? currency.exchangeRates : [];
          const latestRate =
            rates.length > 0
              ? [...rates].sort(
                (a: any, b: any) =>
                  new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
              )[0]
              : null;

          return {
            code: currency.code || "",
            name: currency.name || "",
            symbol: currency.symbol || "",
            isBaseCurrency: Boolean(currency.isBaseCurrency || currency.isBase),
            isActive: currency.isActive !== false,
            latestExchangeRate:
              latestRate && Number.isFinite(Number(latestRate.rate))
                ? Number(latestRate.rate)
                : null,
            asOfDate: latestRate?.date
              ? new Date(latestRate.date).toISOString().slice(0, 10)
              : "",
          };
        });

        setRows(mappedRows);
      } catch (error) {
        console.error("Error loading currencies for export:", error);
        alert("Failed to load currencies for export.");
      } finally {
        setLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  const exportRows = useMemo(() => {
    return rows.map((row) => {
      const formattedRate =
        row.latestExchangeRate === null
          ? ""
          : decimalFormat === "1,234,567.89"
            ? row.latestExchangeRate.toLocaleString("en-US", { maximumFractionDigits: 6 })
            : decimalFormat === "1.234.567,89"
              ? row.latestExchangeRate
                .toLocaleString("de-DE", { maximumFractionDigits: 6 })
              : row.latestExchangeRate;

      return {
        "Currency Code": row.code,
        "Currency Name": row.name,
        Symbol: row.symbol,
        "Is Base Currency": row.isBaseCurrency ? "TRUE" : "FALSE",
        "Is Active": row.isActive ? "TRUE" : "FALSE",
        "Latest Exchange Rate": formattedRate,
        "As Of Date": row.asOfDate,
      };
    });
  }, [rows, decimalFormat]);

  const handleExport = () => {
    if (rows.length === 0) {
      alert("No currency data available to export.");
      return;
    }

    if (password.trim()) {
      alert("Password-protected exports are not available yet. Exporting without password.");
    }

    const fileBase = `currencies_export_${new Date().toISOString().slice(0, 10)}`;

    if (fileFormat !== "csv") {
      alert("XLS/XLSX export is temporarily disabled. Downloading CSV instead.");
    }

    const headers = Object.keys(exportRows[0]);
    const lines = [
      headers.join(","),
      ...exportRows.map((row) => headers.map((key) => toCsvCell((row as any)[key])).join(",")),
    ];
    const csvContent = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileBase}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    navigate("/settings/currencies");
  };

  const handleCancel = () => {
    navigate("/settings/currencies");
  };

  return (
    <div className="fixed inset-0 bg-white z-[10000] overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Export Currencies</h1>
        <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              You can export your currency and exchange rate data in CSV, XLS, or XLSX format.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module<span className="text-red-500">*</span>
            </label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Currencies & Exchange Rates</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimal Format<span className="text-red-500">*</span>
            </label>
            <select
              value={decimalFormat}
              onChange={(e) => setDecimalFormat(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1234567.89">1234567.89</option>
              <option value="1,234,567.89">1,234,567.89</option>
              <option value="1.234.567,89">1.234.567,89</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export File Format<span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fileFormat"
                  value="csv"
                  checked={fileFormat === "csv"}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">CSV (Comma Separated Value)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fileFormat"
                  value="xls"
                  checked={fileFormat === "xls"}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">XLS (Microsoft Excel 97-2004)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fileFormat"
                  value="xlsx"
                  checked={fileFormat === "xlsx"}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">XLSX (Microsoft Excel)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Protection Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
            {loading ? "Loading currencies..." : `Rows available for export: ${rows.length}`}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || rows.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
