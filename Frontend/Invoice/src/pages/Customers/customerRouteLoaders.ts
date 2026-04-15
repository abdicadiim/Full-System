import { lazy } from "react";

export const loadCustomersIndexRoute = () => import("./Customers");
export const loadNewCustomerRoute = () => import("./NewCustomer/NewCustomer");
export const loadCustomerDetailRoute = () => import("./CustomerDetail/CustomerDetail");
export const loadImportCustomersRoute = () => import("./ImportCustomers/ImportCustomers");
export const loadNewCustomViewRoute = () => import("./NewCustomView/NewCustomView");
export const loadRequestReviewRoute = () => import("./RequestReview/RequestReview");
export const loadSendEmailStatementRoute = () => import("./CustomerDetail/SendEmailStatement/SendEmailStatement");

export const CustomersIndexRoute = lazy(loadCustomersIndexRoute);
export const NewCustomerRoute = lazy(loadNewCustomerRoute);
export const CustomerDetailRoute = lazy(loadCustomerDetailRoute);
export const ImportCustomersRoute = lazy(loadImportCustomersRoute);
export const NewCustomViewRoute = lazy(loadNewCustomViewRoute);
export const RequestReviewRoute = lazy(loadRequestReviewRoute);
export const SendEmailStatementRoute = lazy(loadSendEmailStatementRoute);

export const preloadCustomersIndexRoute = () => loadCustomersIndexRoute();
export const preloadCustomerDetailRoute = () => loadCustomerDetailRoute();
