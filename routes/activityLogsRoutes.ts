import express from "express";
import mongoose from "mongoose";
import { ActivityLog } from "../models/ActivityLog.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) =>
  row
    ? {
        ...row,
        id: String(row._id),
      }
    : row;

router.get("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ success: false, message: "DB not connected", data: null });
  }

  const filter: Record<string, any> = { organizationId: orgId };
  if (typeof req.query.actorId === "string" && req.query.actorId.trim()) filter.actorId = req.query.actorId.trim();
  if (typeof req.query.resource === "string" && req.query.resource.trim()) filter.resource = new RegExp(req.query.resource.trim(), "i");
  if (typeof req.query.action === "string" && req.query.action.trim()) filter.action = new RegExp(req.query.action.trim(), "i");
  if (typeof req.query.entityType === "string" && req.query.entityType.trim()) filter.entityType = new RegExp(req.query.entityType.trim(), "i");

  const limitRaw = Number(req.query.limit || 200);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 1000)) : 200;

  if (typeof req.query.minStatusCode === "string" && req.query.minStatusCode.trim()) {
    const value = Number(req.query.minStatusCode);
    if (Number.isFinite(value)) filter.statusCode = { $gte: value };
  }

  const rows = await ActivityLog.find(filter).sort({ occurredAt: -1, createdAt: -1 }).limit(limit).lean();
  return res.json({ success: true, data: rows.map(normalizeRow) });
});

export default router;
