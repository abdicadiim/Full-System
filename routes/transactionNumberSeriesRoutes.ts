import { Router } from "express";
import { requireAuth, requireOrgAdmin } from "../midelwares/requireAuth.js";
import {
  createTransactionNumberSeriesBulk,
  deleteTransactionNumberSeries,
  getNextTransactionNumber,
  getTransactionNumberSettings,
  listTransactionNumberSeries,
  updateTransactionNumberSettings,
  updateTransactionNumberSeriesBulk,
} from "../controllers/transactionNumberSeriesController.js";

export const transactionNumberSeriesRoutes = Router();

transactionNumberSeriesRoutes.get("/", requireAuth, listTransactionNumberSeries);
transactionNumberSeriesRoutes.delete("/:id", requireAuth, requireOrgAdmin, deleteTransactionNumberSeries);

transactionNumberSeriesRoutes.post("/bulk", requireAuth, requireOrgAdmin, createTransactionNumberSeriesBulk);
transactionNumberSeriesRoutes.put("/bulk", requireAuth, requireOrgAdmin, updateTransactionNumberSeriesBulk);

transactionNumberSeriesRoutes.get("/next-number", requireAuth, getNextTransactionNumber);
transactionNumberSeriesRoutes.get("/:id/next-number", requireAuth, getNextTransactionNumber);

transactionNumberSeriesRoutes.get("/settings", requireAuth, getTransactionNumberSettings);
transactionNumberSeriesRoutes.put("/settings", requireAuth, requireOrgAdmin, updateTransactionNumberSettings);

