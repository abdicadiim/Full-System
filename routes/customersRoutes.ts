import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  bulkDeleteCustomers,
  bulkUpdateCustomers,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getNextCustomerNumber,
  listCustomers,
  mergeCustomers,
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

