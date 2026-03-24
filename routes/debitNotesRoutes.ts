import express from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  listDebitNotes,
  getDebitNoteById,
  createDebitNote,
  updateDebitNote,
  deleteDebitNote,
  getNextDebitNoteNumber,
  sendDebitNoteEmail,
} from "../controllers/debitNotesController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/next-number", getNextDebitNoteNumber);
router.get("/", listDebitNotes);
router.get("/:id", getDebitNoteById);
router.post("/", createDebitNote);
router.post("/:id/send-email", sendDebitNoteEmail);
router.put("/:id", updateDebitNote);
router.delete("/:id", deleteDebitNote);

export default router;
