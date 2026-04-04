import React from "react";
import useCustomersPageController from "./useCustomersPageController";
import CustomersPageContent from "./CustomersPageContent";
import CustomersBulkUpdateModal from "./CustomersBulkUpdateModal";
import CustomersSearchModal from "./CustomersSearchModal";
import CustomersSecondaryModals from "./CustomersSecondaryModals";

export default function Customers() {
  const controller = useCustomersPageController();

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
      <CustomersPageContent controller={controller} />
      <CustomersBulkUpdateModal controller={controller} />
      <CustomersSearchModal controller={controller} />
      <CustomersSecondaryModals controller={controller} />
    </div>
  );
}

