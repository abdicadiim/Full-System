import express from "express";
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
  sendInvoiceEmail,
} from "../controllers/invoicesController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/next-number", getNextInvoiceNumber);
router.get("/", listInvoices);
router.get("/:id", getInvoiceById);
router.post("/", createInvoice);
router.post("/:id/send-email", sendInvoiceEmail);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;
