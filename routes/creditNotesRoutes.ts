import express from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  listCreditNotes,
  getCreditNoteById,
  createCreditNote,
  updateCreditNote,
  deleteCreditNote,
  getNextCreditNoteNumber,
  sendCreditNoteEmail,
} from "../controllers/creditNotesController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/next-number", getNextCreditNoteNumber);
router.get("/", listCreditNotes);
router.get("/:id", getCreditNoteById);
router.post("/", createCreditNote);
router.post("/:id/send-email", sendCreditNoteEmail);
router.put("/:id", updateCreditNote);
router.delete("/:id", deleteCreditNote);

export default router;
