import React from "react";

import CustomerCommentsPanel from "../CustomerDetail/CustomerCommentsPanel";
import CustomerDetailSidebar from "./CustomerDetailSidebar";
import CustomerDetailMainHeader from "./CustomerDetailMainHeader";
import CustomerDetailOverviewLeft from "./CustomerDetailOverviewLeft";
import CustomerDetailOverviewRight from "./CustomerDetailOverviewRight";
import CustomerDetailPurchasesTab from "./CustomerDetailPurchasesTab";
import CustomerDetailTransactionsSales from "./CustomerDetailTransactionsSales";
import CustomerDetailPrimaryModals from "./CustomerDetailPrimaryModals";
import CustomerDetailAddContactPersonModal from "./CustomerDetailAddContactPersonModal";
import CustomerDetailAssociateTagsModal from "./CustomerDetailAssociateTagsModal";
import CustomerDetailAddressModal from "./CustomerDetailAddressModal";
import CustomerDetailOutlookModal from "./CustomerDetailOutlookModal";
import CustomerDetailZohoModal from "./CustomerDetailZohoModal";
import CustomerDetailDeleteModals from "./CustomerDetailDeleteModals";
import CustomerDetailInviteModal from "./CustomerDetailInviteModal";
import CustomerDetailAdditionalAddressModal from "./CustomerDetailAdditionalAddressModal";
import { useCustomerDetailState } from "./useCustomerDetailState";
import { useCustomerDetailData } from "./useCustomerDetailData";
import { useCustomerDetailAddresses } from "./useCustomerDetailAddresses";
import { useCustomerDetailActions } from "./useCustomerDetailActions";
import { useCustomerDetailTools } from "./useCustomerDetailTools";
import { useCustomerDetailLists } from "./useCustomerDetailLists";
import { useCustomerDetailViewModel } from "./useCustomerDetailViewModel";
import { useCustomerDetailMailLog } from "../CustomerDetail/useCustomerDetailMailLog";

export default function CustomerDetail() {
    const detail: any = {};

    useCustomerDetailState(detail);
    useCustomerDetailData(detail);
    useCustomerDetailAddresses(detail);
    useCustomerDetailActions(detail);
    useCustomerDetailTools(detail);
    useCustomerDetailLists(detail);
    useCustomerDetailViewModel(detail);
    useCustomerDetailMailLog(detail);

    const { customer, loading } = detail as any;
    const activeTab = String(detail?.activeTab || "overview");
    const customerId = String(customer?._id || customer?.id || detail?.routeCustomerId || "").trim();

    if (!customer && loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="text-lg text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!customer) {
        return null;
    }

    return (
        <div className="w-full h-[calc(100vh-72px)] flex bg-white overflow-hidden" style={{ margin: 0, padding: 0, maxWidth: "100%" }}>
            <CustomerDetailSidebar detail={detail} />

            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
                <CustomerDetailMainHeader detail={detail} />

                <div className="flex-1 min-h-0 overflow-hidden bg-white">
                    {activeTab === "overview" && (
                        <div className="flex h-full min-h-0 items-stretch overflow-hidden">
                            <div className="h-full w-[360px] flex-shrink-0 overflow-hidden border-r border-gray-200 bg-white">
                                <CustomerDetailOverviewLeft detail={detail} />
                            </div>
                            <div className="h-full flex-1 min-w-0 overflow-hidden bg-white">
                                <CustomerDetailOverviewRight detail={detail} />
                            </div>
                        </div>
                    )}

                    {activeTab === "comments" && (
                        <CustomerCommentsPanel
                            customerId={customerId}
                            comments={detail?.comments || []}
                            onCommentsChange={(nextComments) => {
                                if (typeof detail?.setComments === "function") {
                                    detail.setComments(nextComments);
                                }
                            }}
                        />
                    )}

                    {activeTab === "transactions" && <CustomerDetailTransactionsSales detail={detail} />}

                    {(activeTab === "purchases" || activeTab === "mails" || activeTab === "statement") && (
                        <CustomerDetailPurchasesTab detail={detail} />
                    )}
                </div>
            </div>

            <CustomerDetailPrimaryModals detail={detail} />
            <CustomerDetailAddContactPersonModal detail={detail} />
            <CustomerDetailAssociateTagsModal detail={detail} />
            <CustomerDetailAddressModal detail={detail} />
            <CustomerDetailOutlookModal detail={detail} />
            <CustomerDetailZohoModal detail={detail} />
            <CustomerDetailDeleteModals detail={detail} />
            <CustomerDetailInviteModal detail={detail} />
            <CustomerDetailAdditionalAddressModal detail={detail} />
        </div>
    );
}
