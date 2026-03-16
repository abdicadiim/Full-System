import React, { useState } from "react";
import { Search, ChevronDown, MoreHorizontal, Settings, SlidersHorizontal, ArrowUpDown } from "lucide-react";

export default function ProductsList() {
    const [products, setProducts] = useState([
        { id: 1, name: "asddc", description: "", status: "Active", plans: 0, addons: 0, coupons: 0 }
    ]);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Table Header */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="px-6 py-3 w-12">
                                <div className="flex items-center">
                                    <SlidersHorizontal size={14} className="text-blue-600" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                                    NAME
                                    <ArrowUpDown size={12} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                DESCRIPTION
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                STATUS
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                PLANS
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                ADDONS
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                COUPONS
                            </th>
                            <th className="px-4 py-3 w-10">
                                <Search size={14} className="text-gray-400 cursor-pointer" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-[13px] font-medium text-blue-600 hover:underline cursor-pointer">
                                        {product.name}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-[13px] text-gray-500">
                                    {product.description || "-"}
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-[12px] font-bold text-[#1b5e6a] bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        {product.status}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-[13px] text-gray-600">
                                    {product.plans}
                                </td>
                                <td className="px-4 py-4 text-[13px] text-gray-600">
                                    {product.addons}
                                </td>
                                <td className="px-4 py-4 text-[13px] text-gray-600">
                                    {product.coupons}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal size={16} className="text-gray-400 cursor-pointer" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {products.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Settings size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-sm">No products found</p>
                </div>
            )}
        </div>
    );
}
