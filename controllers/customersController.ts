import type express from "express";
import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { CustomersVendorsSettings } from "../models/CustomersVendorsSettings.js";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getOrgId = (req: express.Request) => {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  if (!mongoose.isValidObjectId(orgId)) return null;
  return orgId;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const detectPrefix = (value: unknown) => {
  const text = asString(value).trim();
  if (!text) return "";
  const match = text.match(/^(\D*?)(\d+)/);
  return match ? match[1] : "";
};

const computeNextNumber = (existing: string[], opts: { prefix: string; start: string }) => {
  const prefix = opts.prefix || "";
  const startRaw = opts.start || "0001";
  const startNum = Number.parseInt(String(startRaw).replace(/\D/g, ""), 10);
  const pad = String(startRaw).replace(/\D/g, "").length || 4;

  let max = Number.isFinite(startNum) ? startNum - 1 : 0;
  for (const raw of existing) {
    const v = String(raw || "").trim();
    if (!v) continue;
    if (prefix && !v.startsWith(prefix)) continue;
    const numericPart = v.slice(prefix.length).match(/\d+/)?.[0] || "";
    const num = Number.parseInt(numericPart, 10);
    if (Number.isFinite(num) && num > max) max = num;
  }
  const next = max + 1;
  const nextPadded = String(next).padStart(pad, "0");
  return `${prefix}${nextPadded}`;
};

export const listCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const q = asString(req.query.search ?? req.query.q).trim();
    const status = asString(req.query.status).trim().toLowerCase();
    const limit = Math.max(0, Number(req.query.limit || 0));
    const page = Math.max(1, Number(req.query.page || 1));

    const filter: any = { organizationId: orgId };
    if (status) filter.status = new RegExp(`^${escapeRegExp(status)}$`, "i");
    if (q) {
      const re = new RegExp(escapeRegExp(q), "i");
      filter.$or = [
        { name: re },
        { displayName: re },
        { companyName: re },
        { email: re },
        { customerNumber: re },
      ];
    }

    const total = await Customer.countDocuments(filter);

    let query = Customer.find(filter).sort({ createdAt: -1 });
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

export const getCustomerById: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const row = await Customer.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!row) return res.status(404).json({ success: false, message: "Customer not found", data: null });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

export const createCustomer: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const payload = (req.body || {}) as Record<string, unknown>;
    const desiredCustomerNumber = asString(payload.customerNumber).trim();

    let customerNumber = desiredCustomerNumber;
    if (!customerNumber) {
      const settings = await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean();
      const prefix = settings?.customerNumberPrefix || "CUS-";
      const existingNumbers = await Customer.find(
        { organizationId: orgId, customerNumber: new RegExp(`^${escapeRegExp(prefix)}`) },
        { customerNumber: 1 }
      )
        .lean()
        .then((rows) => rows.map((r: any) => String(r.customerNumber || "")));
      customerNumber = computeNextNumber(existingNumbers, {
        prefix,
        start: settings?.customerNumberStart || "0001",
      });
    } else {
      const exists = await Customer.exists({ organizationId: orgId, customerNumber });
      if (exists) {
        const prefix = detectPrefix(customerNumber) || "CUS-";
        const settings = await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean();
        const existingNumbers = await Customer.find(
          { organizationId: orgId, customerNumber: new RegExp(`^${escapeRegExp(prefix)}`) },
          { customerNumber: 1 }
        )
          .lean()
          .then((rows) => rows.map((r: any) => String(r.customerNumber || "")));
        customerNumber = computeNextNumber(existingNumbers, {
          prefix,
          start: settings?.customerNumberStart || "0001",
        });
      }
    }

    const created = await Customer.create({ ...payload, customerNumber, organizationId: orgId });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const updated = await Customer.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      { $set: { ...(req.body || {}) } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, message: "Customer not found", data: null });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, organizationId: orgId }).lean();
    if (!deleted) return res.status(404).json({ success: false, message: "Customer not found", data: null });
    res.json({ success: true, data: { id: String(deleted._id) } });
  } catch (err) {
    next(err);
  }
};

export const bulkUpdateCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
    const data = (req.body?.data || {}) as Record<string, unknown>;
    const objectIds = ids.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(String(id)));
    if (!objectIds.length) return res.json({ success: true, data: [] });

    await Customer.updateMany({ organizationId: orgId, _id: { $in: objectIds } }, { $set: data });
    const rows = await Customer.find({ organizationId: orgId, _id: { $in: objectIds } }).lean();
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const bulkDeleteCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
    const objectIds = ids.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(String(id)));
    if (!objectIds.length) return res.json({ success: true, data: { ids: [] } });

    await Customer.deleteMany({ organizationId: orgId, _id: { $in: objectIds } });
    res.json({ success: true, data: { ids: objectIds.map((id) => String(id)) } });
  } catch (err) {
    next(err);
  }
};

export const mergeCustomers: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ success: false, message: "Invalid target id", data: null });
    }
    const target = await Customer.findOne({ _id: targetId, organizationId: orgId });
    if (!target) return res.status(404).json({ success: false, message: "Target customer not found", data: null });

    const sourceIds = Array.isArray(req.body?.sourceCustomerIds) ? (req.body.sourceCustomerIds as unknown[]) : [];
    const objectIds = sourceIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => String(id))
      .filter((id) => id !== targetId);

    if (!objectIds.length) {
      return res.status(400).json({ success: false, message: "No source customers found to merge", data: null });
    }

    // Mark sources inactive and point to target.
    await Customer.updateMany(
      { organizationId: orgId, _id: { $in: objectIds } },
      { $set: { status: "inactive", mergedInto: targetId, updatedAt: new Date().toISOString() } }
    );

    // Optionally aggregate some numeric fields if present.
    const sources = await Customer.find({ organizationId: orgId, _id: { $in: objectIds } }).lean();
    const sumNumber = (key: string) =>
      sources.reduce((sum, s: any) => sum + (Number.parseFloat(String((s as any)?.[key] ?? 0)) || 0), 0);

    const patch: any = {};
    if ((target as any).receivables !== undefined) patch.receivables = (Number((target as any).receivables) || 0) + sumNumber("receivables");
    if ((target as any).unusedCredits !== undefined)
      patch.unusedCredits = (Number((target as any).unusedCredits) || 0) + sumNumber("unusedCredits");

    const updated = await Customer.findOneAndUpdate({ _id: targetId, organizationId: orgId }, { $set: patch }, { new: true }).lean();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const getNextCustomerNumber: express.RequestHandler = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ success: false, message: "Unauthenticated", data: null });

    const settings = await CustomersVendorsSettings.findOne({ organizationId: orgId }).lean();
    const prefix = asString(req.query.prefix).trim() || settings?.customerNumberPrefix || "CUS-";
    const start = asString(req.query.start).trim() || settings?.customerNumberStart || "0001";

    const re = new RegExp(`^${escapeRegExp(prefix)}`);
    const rows = await Customer.find({ organizationId: orgId, customerNumber: re }, { customerNumber: 1 }).lean();
    const existing = rows.map((r: any) => String(r.customerNumber || ""));
    const nextNumber = computeNextNumber(existing, { prefix, start });

    res.json({ success: true, data: nextNumber });
  } catch (err) {
    next(err);
  }
};
