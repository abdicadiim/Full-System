import React from "react";
import CustomerDetailOverviewContent from "./CustomerDetailOverviewContent";
import CustomerDetailOverviewSidebar from "./CustomerDetailOverviewSidebar";

export default function CustomerDetailOverviewTab(args: any) {
  return (
    <div className="flex-1 min-h-0 bg-[#f8f9fc]">
      <div className="flex min-h-full">
        <CustomerDetailOverviewSidebar {...args} />
        <CustomerDetailOverviewContent {...args} />
      </div>
    </div>
  );
}
