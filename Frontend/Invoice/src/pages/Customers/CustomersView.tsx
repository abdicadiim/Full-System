import React from "react";
import CustomersMainContent from "./CustomersMainContent";
import CustomersActionModals from "./CustomersActionModals";
import CustomersSearchModal from "./CustomersSearchModal";
import ExportCustomersModal from "./ExportCustomersModal";
import CustomersPreferencesSidebar from "./CustomersPreferencesSidebar";
import ImportCustomersModal from "./ImportCustomersModal";
import CustomizeColumnsModal from "./CustomizeColumnsModal";

type Props = {
  controller: any;
};

export default function CustomersView({ controller }: Props) {
  return (
    <>
      <CustomersMainContent controller={controller} />
      <CustomersActionModals controller={controller} />
      <CustomersSearchModal controller={controller} />
      <ExportCustomersModal controller={controller} />
      <CustomersPreferencesSidebar controller={controller} />
      <ImportCustomersModal controller={controller} />
      <CustomizeColumnsModal controller={controller} />
    </>
  );
}
