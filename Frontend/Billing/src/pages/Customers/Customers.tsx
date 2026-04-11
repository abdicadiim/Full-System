import React, { Suspense, lazy, useMemo } from "react";
import { useLocation } from "react-router-dom";
import CustomerDetail from "./CustomerDetail/CustomerDetail";
import useCustomersPageController from "./useCustomersPageController";
import CustomersPageContent from "./CustomersPageContent";

const CustomersBulkUpdateModal = lazy(() => import("./CustomersBulkUpdateModal"));
const CustomersSearchModal = lazy(() => import("./CustomersSearchModal"));
const CustomersSecondaryModals = lazy(() => import("./CustomersSecondaryModals"));

export default function Customers() {
  const location = useLocation();
  const pathname = location.pathname || "";
  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] || "";
  const isCustomerDetailPath =
    pathname.startsWith("/sales/customers/") &&
    !["new", "import", "new-custom-view", "request-review", "send-email-statement", "edit"].includes(lastSegment);

  if (isCustomerDetailPath) {
    return <CustomerDetail />;
  }

  const controller = useCustomersPageController();
  const shouldRenderBulkUpdateModal = Boolean(controller.isBulkUpdateModalOpen);
  const shouldRenderSearchModal = Boolean(controller.isSearchModalOpen);
  const shouldRenderSecondaryModals = useMemo(() => Boolean(
    controller.isExportCurrentViewModalOpen ||
    controller.isExportCustomersModalOpen ||
    controller.isFieldCustomizationOpen ||
    controller.isPreferencesOpen ||
    controller.isDeleteModalOpen ||
    controller.isBulkDeleteModalOpen ||
    controller.isPrintModalOpen ||
    controller.isPrintPreviewOpen ||
    controller.isImportModalOpen ||
    controller.isMergeModalOpen ||
    controller.isCustomizeModalOpen ||
    controller.bulkConsolidatedAction ||
    controller.openReceivablesDropdownId
  ), [
    controller.bulkConsolidatedAction,
    controller.isBulkDeleteModalOpen,
    controller.isCustomizeModalOpen,
    controller.isDeleteModalOpen,
    controller.isExportCurrentViewModalOpen,
    controller.isExportCustomersModalOpen,
    controller.isFieldCustomizationOpen,
    controller.isImportModalOpen,
    controller.isMergeModalOpen,
    controller.isPreferencesOpen,
    controller.isPrintModalOpen,
    controller.isPrintPreviewOpen,
    controller.openReceivablesDropdownId,
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-white font-sans text-gray-800 antialiased relative overflow-hidden">
      <CustomersPageContent controller={controller} />
      {shouldRenderBulkUpdateModal ? (
        <Suspense fallback={null}>
          <CustomersBulkUpdateModal controller={controller} />
        </Suspense>
      ) : null}
      {shouldRenderSearchModal ? (
        <Suspense fallback={null}>
          <CustomersSearchModal controller={controller} />
        </Suspense>
      ) : null}
      {shouldRenderSecondaryModals ? (
        <Suspense fallback={null}>
          <CustomersSecondaryModals controller={controller} />
        </Suspense>
      ) : null}
    </div>
  );
}
