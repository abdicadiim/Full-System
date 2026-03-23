import express from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  listSalesReceipts,
  getSalesReceiptById,
  createSalesReceipt,
  updateSalesReceipt,
  deleteSalesReceipt,
  getNextSalesReceiptNumber,
  sendSalesReceiptEmail,
} from "../controllers/salesReceiptsController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/next-number", getNextSalesReceiptNumber);
router.get("/", listSalesReceipts);
router.get("/:id", getSalesReceiptById);
router.post("/", createSalesReceipt);
router.post("/:id/send-email", sendSalesReceiptEmail);
router.put("/:id", updateSalesReceipt);
router.delete("/:id", deleteSalesReceipt);

export default router;
