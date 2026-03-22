import type express from "express";
import mongoose from "mongoose";
import { Item } from "../models/Item.js";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asString = (value: unknown) => (typeof value === "string" ? value : "");

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const getActor = (req: express.Request) => {
  const user = req.user;
  if (!user) return { id: "unknown", name: "Unknown" };
  return { id: String(user.id || "unknown"), name: String(user.name || user.email || "Unknown") };
};

const computeIsInactive = (row: any) =>
  row?.active === false || row?.isActive === false || String(row?.status || "").toLowerCase() === "inactive";

export const listItems: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const q = asString(req.query.search ?? req.query.q).trim();
    const status = asString(req.query.status).trim();
    const type = asString(req.query.type).trim();
    const limit = Math.max(0, Number(req.query.limit || 0));
    const page = Math.max(1, Number(req.query.page || 1));

    const filter: any = { organizationId: orgId };
    if (status) filter.status = new RegExp(`^${escapeRegExp(status)}$`, "i");
    if (type) filter.type = new RegExp(`^${escapeRegExp(type)}$`, "i");
    if (q) {
      const re = new RegExp(escapeRegExp(q), "i");
      filter.$or = [{ name: re }, { sku: re }, { description: re }];
    }

    const total = await Item.countDocuments(filter);
    let query = Item.find(filter).sort({ createdAt: -1 });
    if (limit > 0) query = query.skip((page - 1) * limit).limit(limit);
    const rows = await query.lean();

    res.json({
      success: true,
      data: rows,
      total,
      page,
      limit: limit || total,
      totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    });
  } catch (err) {
    next(err);
  }
};

export const getItemById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const row = await Item.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Item not found", data: null });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

export const createItem: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const actor = getActor(req);

    const payload = (req.body || {}) as Record<string, unknown>;
    const name = asString(payload.name).trim();
    if (!name) return res.status(400).json({ success: false, message: "Item name is required", data: null });

    const created = await Item.create({
      ...payload,
      organizationId: orgId,
      createdBy: actor,
      updatedBy: actor,
      history: [
        {
          action: "created",
          by: actor,
          at: new Date().toISOString(),
          details: "created",
        },
      ],
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateItem: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const actor = getActor(req);
    const existing = await Item.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Item not found", data: null });

    const prevInactive = computeIsInactive(existing);

    const body = (req.body || {}) as Record<string, unknown>;
    const nextRow = { ...existing, ...body };
    const nextInactive = computeIsInactive(nextRow);

    const activeChanged = prevInactive !== nextInactive;

    const changedFields = Object.keys(body).filter((key) => {
      if (key === "history" || key === "updatedBy" || key === "createdBy") return false;
      if (key === "__v" || key === "_id" || key === "id") return false;
      return true;
    });

    const historyEntry = {
      action: activeChanged ? (nextInactive ? "marked_inactive" : "marked_active") : "updated",
      by: actor,
      at: new Date().toISOString(),
      details: activeChanged
        ? (nextInactive ? "marked as inactive" : "marked as active")
        : changedFields.length > 0
          ? `updated: ${changedFields.slice(0, 8).join(", ")}${changedFields.length > 8 ? "..." : ""}`
          : "updated",
    };

    const updated = await Item.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      { $set: { ...body, updatedBy: actor }, $push: { history: historyEntry } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Item not found", data: null });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteItem: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const deleted = await Item.findOneAndDelete({ _id: req.params.id, organizationId: orgId }).lean();
    if (!deleted) return res.status(404).json({ success: false, message: "Item not found", data: null });
    res.json({ success: true, data: { id: String(deleted._id) } });
  } catch (err) {
    next(err);
  }
};
