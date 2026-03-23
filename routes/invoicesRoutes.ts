import express from "express";
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
} from "../controllers/invoicesController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/next-number", getNextInvoiceNumber);
router.get("/", listInvoices);
router.get("/:id", getInvoiceById);
router.post("/", createInvoice);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;

