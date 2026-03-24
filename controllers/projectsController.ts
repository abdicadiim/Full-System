import type express from "express";
import { Project } from "../models/Project.js";
import { recordEvent } from "../services/eventService.js";

const requireOrgId = (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    res.status(401).json({ success: false, message: "Unauthenticated", data: null });
    return null;
  }
  return orgId;
};

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

export const listProjects: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = req.query.customerId;

  const total = await Project.countDocuments(filter);
  const rows = await Project.find(filter).sort({ createdAt: -1 }).lean();

  return res.json({ success: true, data: rows.map(normalizeRow), pagination: { total, page: 1, limit: total, pages: 1 } });
};

export const getProjectById: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const row = await Project.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Project not found", data: null });

  return res.json({ success: true, data: normalizeRow(row) });
};

export const createProject: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  try {
    const created = await Project.create({ ...req.body, organizationId: orgId });
    await recordEvent('project_created', { project: created || null }, 'user');
    return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message, data: null });
  }
};

export const updateProject: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const updated = await Project.findOneAndUpdate({ _id: req.params.id, organizationId: orgId }, { $set: req.body }, { new: true }).lean();
    if (updated) await recordEvent('project_updated', { project: updated }, 'user');
  if (!updated) return res.status(404).json({ success: false, message: "Project not found", data: null });

  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteProject: express.RequestHandler = async (req, res) => {
  const orgId = requireOrgId(req, res);
  if (!orgId) return;

  const deleted = await Project.findOneAndDelete({ _id: req.params.id, organizationId: orgId }).lean();
    if (deleted) await recordEvent('project_deleted', { project: deleted }, 'user');
  if (!deleted) return res.status(404).json({ success: false, message: "Project not found", data: null });

  return res.json({ success: true, data: { id: req.params.id } });
};
