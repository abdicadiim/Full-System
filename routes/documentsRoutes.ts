import express, { Router } from "express";
import { requireAuth } from "../midelwares/requireAuth.js";
import {
  deleteDocument,
  downloadDocumentContent,
  getDocumentById,
  listDocuments,
  uploadDocument,
  uploadDocumentBinary,
  viewDocumentContent,
} from "../controllers/documentsController.js";

export const documentsRoutes = Router();

documentsRoutes.get("/", requireAuth, listDocuments);
documentsRoutes.post("/binary", requireAuth, express.raw({ type: "*/*", limit: "15mb" }), uploadDocumentBinary);
documentsRoutes.post("/", requireAuth, uploadDocument);
documentsRoutes.get("/:id", requireAuth, getDocumentById);
documentsRoutes.get("/:id/content", requireAuth, viewDocumentContent);
documentsRoutes.get("/:id/download", requireAuth, downloadDocumentContent);
documentsRoutes.delete("/:id", requireAuth, deleteDocument);
