import React from "react";
import { Plus } from "lucide-react";

export default function TDSRatesPage() {
    const tdsRates: Array<{
        id: string;
        name: string;
        section: string;
        rate: number;
    }> = [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">TDS Rates</h2>
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f4e5a]"
                >
                    <Plus size={16} />
                    New TDS Rate
                </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <table className="w-full">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">TDS Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Section</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Rate (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tdsRates.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-500">
                                    No TDS rates found. Click <span className="font-medium">New TDS Rate</span> to add one.
                                </td>
                            </tr>
                        ) : (
                            tdsRates.map((rate) => (
                                <tr key={rate.id} className="border-b last:border-b-0">
                                    <td className="px-4 py-3 text-sm text-gray-900">{rate.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{rate.section}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{rate.rate}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
