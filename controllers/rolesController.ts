import express from "express";
import mongoose from "mongoose";
import { Role } from "../models/Role.js";

const pickString = (v: unknown) => (typeof v === "string" ? v : "");

export const listRoles = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const rows = await Role.find({ organizationId: orgId, isSystem: false }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: rows });
};

export const getRole = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const row = await Role.findOne({ _id: id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Role not found", data: null });
  return res.json({ success: true, data: row });
};

export const createRole = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const name = pickString(req.body?.name).trim();
  if (!name) return res.status(400).json({ success: false, message: "Role name required", data: null });

  const description = pickString(req.body?.description).trim();
  const permissions = req.body?.permissions && typeof req.body.permissions === "object" ? req.body.permissions : {};

  try {
    const created = await Role.create({
      organizationId: orgId,
      name: name.slice(0, 80),
      description: description.slice(0, 500),
      permissions,
      isSystem: false,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Role name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to create role", data: null });
  }
};

export const updateRole = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const patch: Record<string, unknown> = {};

  const name = pickString(req.body?.name).trim();
  if (name) patch.name = name.slice(0, 80);

  const description = pickString(req.body?.description).trim();
  if (description) patch.description = description.slice(0, 500);

  if (req.body?.permissions && typeof req.body.permissions === "object") {
    patch.permissions = req.body.permissions;
  }

  try {
    const updated = await Role.findOneAndUpdate({ _id: id, organizationId: orgId, isSystem: false }, { $set: patch }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Role not found", data: null });
    return res.json({ success: true, data: updated });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Role name already exists", data: null });
    }
    return res.status(500).json({ success: false, message: "Failed to update role", data: null });
  }
};

export const deleteRole = async (req: express.Request, res: express.Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ success: false, message: "DB not connected", data: null });

  const id = String(req.params.id || "").trim();
  const deleted = await Role.findOneAndDelete({ _id: id, organizationId: orgId, isSystem: false }).lean();
  if (!deleted) return res.status(404).json({ success: false, message: "Role not found", data: null });
  return res.json({ success: true, data: { id } });
};

