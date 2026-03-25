import express from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { TimeEntry } from "../models/TimeEntry.js";
import { requireAuth } from "../midelwares/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const normalizeRow = (row: any) =>
  row
    ? {
        ...row,
        id: String(row._id),
        comments: normalizeTimeEntryComments(row.comments),
      }
    : row;
const normalizeTimeEntryComment = (comment: any, index = 0) => {
  if (!comment || typeof comment !== "object") return null;
  const id = String(comment.id || comment._id || `comment-${index}-${Date.now()}`).trim();
  if (!id) return null;
  const text = String(comment.text ?? comment.content ?? "").trim();
  return {
    id,
    text,
    content: String(comment.content ?? comment.text ?? "").trim(),
    authorName: String(comment.authorName ?? "").trim(),
    authorInitial: String(comment.authorInitial ?? "").trim(),
    createdAt: String(comment.createdAt ?? new Date().toISOString()).trim() || new Date().toISOString(),
    bold: Boolean(comment.bold),
    italic: Boolean(comment.italic),
    underline: Boolean(comment.underline),
  };
};
const normalizeTimeEntryComments = (comments: any) =>
  Array.isArray(comments) ? comments.map((comment, index) => normalizeTimeEntryComment(comment, index)).filter(Boolean) : [];

router.get("/time-entries", async (req, res) => {
  const orgId = req.user?.organizationId;
  const filter: Record<string, any> = { organizationId: orgId };
  if (req.query.projectId) filter.projectId = String(req.query.projectId);
  if (req.query.customerId) filter.customerId = String(req.query.customerId);
  if (req.query.userId) filter.userId = String(req.query.userId);
  const rows = await TimeEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: rows.map(normalizeRow) });
});

router.post("/time-entries", async (req, res) => {
  const orgId = req.user?.organizationId;
  const projectId = String(req.body?.projectId || req.body?.project || "").trim();

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({ success: false, message: "Invalid project id", data: null });
  }

  const project = await Project.findOne({ _id: projectId, organizationId: orgId }).lean();
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found", data: null });
  }

  const hours = Number(req.body?.hours || 0);
  const minutes = Number(req.body?.minutes || 0);
  const duration = Number(req.body?.duration ?? (hours * 60 + minutes));

  const created = await TimeEntry.create({
    ...req.body,
    organizationId: orgId,
    projectId,
    projectName: (project as any).name || (project as any).projectName || req.body?.projectName || "",
    customerId: String((project as any).customer?._id || (project as any).customerId || req.body?.customerId || ""),
    customerName: String((project as any).customer?.name || (project as any).customerName || req.body?.customerName || ""),
    taskName: String(req.body?.taskName || req.body?.task || ""),
    userName: String(req.body?.userName || req.body?.user || ""),
    date: req.body?.date ? new Date(req.body.date) : new Date(),
    duration,
    comments: normalizeTimeEntryComments(req.body?.comments),
  });

  res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
});

router.get("/time-entries/:entryId", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.entryId)) {
    return res.status(400).json({ success: false, message: "Invalid time entry id", data: null });
  }
  const row = await TimeEntry.findOne({ _id: req.params.entryId, organizationId: orgId }).lean();
  if (!row) {
    return res.status(404).json({ success: false, message: "Time entry not found", data: null });
  }
  res.json({ success: true, data: normalizeRow(row) });
});

router.put("/time-entries/:entryId", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.entryId)) {
    return res.status(400).json({ success: false, message: "Invalid time entry id", data: null });
  }
  const updated = await TimeEntry.findOneAndUpdate(
    { _id: req.params.entryId, organizationId: orgId },
    { $set: { ...req.body, comments: normalizeTimeEntryComments(req.body?.comments) } },
    { new: true }
  ).lean();
  if (!updated) {
    return res.status(404).json({ success: false, message: "Time entry not found", data: null });
  }
  res.json({ success: true, data: normalizeRow(updated) });
});

router.delete("/time-entries/:entryId", async (req, res) => {
  const orgId = req.user?.organizationId;
  if (!mongoose.isValidObjectId(req.params.entryId)) {
    return res.status(400).json({ success: false, message: "Invalid time entry id", data: null });
  }
  const deleted = await TimeEntry.findOneAndDelete({ _id: req.params.entryId, organizationId: orgId }).lean();
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Time entry not found", data: null });
  }
  res.json({ success: true, data: { id: req.params.entryId } });
});

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
  const created = await TimeEntry.create({
    ...req.body,
    projectId: req.params.id,
    organizationId: orgId,
    comments: normalizeTimeEntryComments(req.body?.comments),
  });
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
