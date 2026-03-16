import React, { useState } from "react";
import { X } from "lucide-react";
import { Z } from "../../itemsModel";

interface OpeningStockModalProps {
    item: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export default function OpeningStockModal({ item, onClose, onSave }: OpeningStockModalProps) {
    const [openingStock, setOpeningStock] = useState(item.openingStock?.toString() || "0");
    const [openingStockValue, setOpeningStockValue] = useState(item.openingStockValue?.toString() || "0");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            openingStock: parseFloat(openingStock) || 0,
            openingStockValue: parseFloat(openingStockValue) || 0,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">Opening Stock</h2>
                        <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Opening Stock
                            </label>
                            <input
                                type="number"
                                value={openingStock}
                                onChange={(e) => setOpeningStock(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-md outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Opening Stock Value
                            </label>
                            <input
                                type="number"
                                value={openingStockValue}
                                onChange={(e) => setOpeningStockValue(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-md outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

