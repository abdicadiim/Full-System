import express from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { TimeEntry } from "../models/TimeEntry.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

router.get("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = req.query.customerId;
  const total = await Project.countDocuments(filter);
  const rows = await Project.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow), pagination: { total, page: 1, limit: total, pages: 1 } });
});

router.post("/", async (req, res) => {
  const orgId = req.user?.organizationId;
  const created = await Project.create({ ...req.body, organizationId: orgId });
  res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
});

// Time entries
router.get("/:id/time-entries", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid project id", data: null });
  }
  const rows = await TimeEntry.find({ projectId: req.params.id, organizationId: orgId }).lean();
  res.json({ success: true, data: rows.map(normalizeRow) });
});

router.post("/:id/time-entries", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid project id", data: null });
  }
  const created = await TimeEntry.create({ ...req.body, projectId: req.params.id, organizationId: orgId });
  res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
});

router.get("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid project id", data: null });
  }
  const row = await Project.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  res.json({ success: true, data: normalizeRow(row) });
});

router.put("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid project id", data: null });
  }
  const updated = await Project.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
  res.json({ success: true, data: normalizeRow(updated) });
});

router.delete("/:id", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid project id", data: null });
  }
  await Project.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  res.json({ success: true, data: { id: req.params.id } });
});

export default router;
