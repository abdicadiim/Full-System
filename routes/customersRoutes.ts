import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  bulkDeleteCustomers,
  bulkUpdateCustomers,
  addCustomerAddress,
  createCustomer,
  deleteCustomer,
  deleteCustomerAddress,
  getCustomerById,
  getCustomerAddresses,
  getCustomerStatementEmail,
  getNextCustomerNumber,
  disableCustomerPaymentReminders,
  disableCustomerPortal,
  listCustomers,
  mergeCustomers,
  enableCustomerPaymentReminders,
  enableCustomerPortal,
  markCustomerActive,
  markCustomerInactive,
  sendCustomerStatementEmail,
  updateCustomerAddress,
  updateCustomer,
} from "../controllers/customersController.js";

export const customersRoutes = Router();

customersRoutes.get("/", requireAuth, listCustomers);
customersRoutes.get("/next-number", requireAuth, getNextCustomerNumber);
customersRoutes.post("/", requireAuth, createCustomer);

customersRoutes.post("/bulk-update", requireAuth, bulkUpdateCustomers);
customersRoutes.post("/bulk-delete", requireAuth, bulkDeleteCustomers);

customersRoutes.post("/:id/merge", requireAuth, mergeCustomers);
customersRoutes.get("/:id", requireAuth, getCustomerById);
customersRoutes.put("/:id", requireAuth, updateCustomer);
customersRoutes.delete("/:id", requireAuth, deleteCustomer);
customersRoutes.get("/:id/address", requireAuth, getCustomerAddresses);
customersRoutes.post("/:id/address", requireAuth, addCustomerAddress);
customersRoutes.put("/:id/address/:addressId", requireAuth, updateCustomerAddress);
customersRoutes.delete("/:id/address/:addressId", requireAuth, deleteCustomerAddress);
customersRoutes.post("/:id/portal/enable", requireAuth, enableCustomerPortal);
customersRoutes.post("/:id/portal/disable", requireAuth, disableCustomerPortal);
customersRoutes.post("/:id/paymentreminder/enable", requireAuth, enableCustomerPaymentReminders);
customersRoutes.post("/:id/paymentreminder/disable", requireAuth, disableCustomerPaymentReminders);
customersRoutes.get("/:id/statements/email", requireAuth, getCustomerStatementEmail);
customersRoutes.post("/:id/statements/email", requireAuth, sendCustomerStatementEmail);
customersRoutes.post("/:id/active", requireAuth, markCustomerActive);
customersRoutes.post("/:id/inactive", requireAuth, markCustomerInactive);

