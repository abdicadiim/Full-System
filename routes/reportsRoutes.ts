import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  getARAgingDetailsReport,
  getARAgingSummaryReport,
  getBadDebtsReport,
  getBankChargesReport,
  getCustomerBalanceSummaryReport,
  getInvoiceDetailsReport,
  getQuoteDetailsReport,
  getSalesByCustomerReport,
  getSalesByItemReport,
  getSalesBySalesPersonReport,
} from "../controllers/reportsController.js";

export const reportsRoutes = Router();

reportsRoutes.use(requireAuth);
reportsRoutes.get("/sales-by-customer", getSalesByCustomerReport);
reportsRoutes.get("/sales-by-item", getSalesByItemReport);
reportsRoutes.get("/sales-by-sales-person", getSalesBySalesPersonReport);
reportsRoutes.get("/ar-aging-summary", getARAgingSummaryReport);
reportsRoutes.get("/ar-aging-details", getARAgingDetailsReport);
reportsRoutes.get("/invoice-details", getInvoiceDetailsReport);
reportsRoutes.get("/quote-details", getQuoteDetailsReport);
reportsRoutes.get("/customer-balance-summary", getCustomerBalanceSummaryReport);
reportsRoutes.get("/bad-debts", getBadDebtsReport);
reportsRoutes.get("/bank-charges", getBankChargesReport);
