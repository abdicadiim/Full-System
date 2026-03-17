import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import {
  createReportingTag,
  deleteReportingTag,
  getReportingTag,
  listReportingTags,
  updateReportingTag,
} from "../controllers/reportingTagsController.js";

export const reportingTagsRoutes = Router();

reportingTagsRoutes.get("/", requireAuth, listReportingTags);
reportingTagsRoutes.get("/:id", requireAuth, getReportingTag);
reportingTagsRoutes.post("/", requireAuth, requireOrgAdmin, createReportingTag);
reportingTagsRoutes.put("/:id", requireAuth, requireOrgAdmin, updateReportingTag);
reportingTagsRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteReportingTag);

