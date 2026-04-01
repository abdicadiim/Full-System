import { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  deleteDocument,
  downloadDocumentContent,
  getDocumentById,
  listDocuments,
  uploadDocument,
  viewDocumentContent,
} from "../controllers/documentsController.js";

export const documentsRoutes = Router();

documentsRoutes.get("/", requireAuth, listDocuments);
documentsRoutes.post("/", requireAuth, uploadDocument);
documentsRoutes.get("/:id", requireAuth, getDocumentById);
documentsRoutes.get("/:id/content", requireAuth, viewDocumentContent);
documentsRoutes.get("/:id/download", requireAuth, downloadDocumentContent);
documentsRoutes.delete("/:id", requireAuth, deleteDocument);
