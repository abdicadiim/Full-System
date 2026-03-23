import express from "express";
import {
  listQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  getNextQuoteNumber,
  sendQuoteEmail,
  bulkDeleteQuotes
} from "../controllers/quotesController.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/next-number", getNextQuoteNumber);
router.get("/", listQuotes);
router.get("/:id", getQuoteById);
router.post("/", createQuote);
router.post("/bulk-delete", bulkDeleteQuotes);
router.post("/:id/send-email", sendQuoteEmail);
router.put("/:id", updateQuote);
router.delete("/:id", deleteQuote);

export default router;
