import React from "react";
import { ChevronDown, X } from "lucide-react";

const SUPPORTED_SEARCH_TYPES = [
  "Recurring Invoices",
  "Credit Notes",
  "Vendors",
  "Recurring Expenses",
  "Purchase Orders",
  "Bills",
  "Payments Made",
  "Recurring Bills",
  "Vendor Credits",
  "Projects",
  "Timesheet",
  "Journals",
  "Chart of Accounts",
  "Documents",
  "Task",
];

export default function CustomersSearchModalMisc({ controller }: { controller: any }) {
  const {
    isSearchModalOpen,
    resetSearchModalData,
    searchModalData,
    searchType,
    setIsSearchModalOpen,
    setSearchModalData,
  } = controller as any;

  if (!SUPPORTED_SEARCH_TYPES.includes(searchType)) {
    return null;
  }

  return (
    <>
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/50 pt-16 pb-10">
          <div className="mx-4 w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {searchType} Search
              </h2>
              <button
                type="button"
                className="rounded-md p-2 text-gray-500 hover:text-gray-700"
                onClick={() => setIsSearchModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {searchType === "Vendors"
                      ? "Vendor Name"
                      : searchType === "Projects"
                        ? "Project Name"
                        : searchType === "Chart of Accounts"
                          ? "Account Name"
                          : searchType === "Documents"
                            ? "Document Name"
                            : searchType === "Task"
                              ? "Task Name"
                              : `${searchType} Number`}
                  </label>
                  <input
                    type="text"
                    value={searchModalData.referenceNumber || ""}
                    onChange={(e) =>
                      setSearchModalData((prev: any) => ({
                        ...prev,
                        referenceNumber: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="dd/MM/yyyy"
                      value={searchModalData.dateRangeFrom || ""}
                      onChange={(e) =>
                        setSearchModalData((prev: any) => ({
                          ...prev,
                          dateRangeFrom: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="text"
                      placeholder="dd/MM/yyyy"
                      value={searchModalData.dateRangeTo || ""}
                      onChange={(e) =>
                        setSearchModalData((prev: any) => ({
                          ...prev,
                          dateRangeTo: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {searchType !== "Vendors" &&
                  searchType !== "Chart of Accounts" &&
                  searchType !== "Documents" &&
                  searchType !== "Task" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {searchType.includes("Payment")
                          ? "Customer Name"
                          : searchType.includes("Bill") ||
                              searchType.includes("Expense") ||
                              searchType === "Purchase Orders"
                            ? "Vendor Name"
                            : "Customer Name"}
                      </label>
                      <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                        <span className="text-gray-400">
                          Select{" "}
                          {searchType.includes("Payment")
                            ? "customer"
                            : searchType.includes("Bill") ||
                                searchType.includes("Expense") ||
                                searchType === "Purchase Orders"
                              ? "vendor"
                              : "customer"}
                        </span>
                        <ChevronDown size={16} className="text-gray-500" />
                      </div>
                    </div>
                  )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Total Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchModalData.totalRangeFrom || ""}
                      onChange={(e) =>
                        setSearchModalData((prev: any) => ({
                          ...prev,
                          totalRangeFrom: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="text"
                      value={searchModalData.totalRangeTo || ""}
                      onChange={(e) =>
                        setSearchModalData((prev: any) => ({
                          ...prev,
                          totalRangeTo: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Reference#
                  </label>
                  <input
                    type="text"
                    value={searchModalData.referenceNumber || ""}
                    onChange={(e) =>
                      setSearchModalData((prev: any) => ({
                        ...prev,
                        referenceNumber: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                    <span>{searchModalData.status || "All"}</span>
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Account
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                    <span className="text-gray-400">Select an account</span>
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={searchModalData.notes || ""}
                    onChange={(e) =>
                      setSearchModalData((prev: any) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                className="rounded-md bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => setIsSearchModalOpen(false)}
              >
                Search
              </button>
              <button
                type="button"
                className="rounded-md bg-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
                onClick={() => {
                  setIsSearchModalOpen(false);
                  resetSearchModalData();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
