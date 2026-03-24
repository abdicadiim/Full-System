import { Subscription } from "../models/Subscription.js";

const normalizeRow = (row: any) => (row ? { ...row, id: String(row._id) } : row);

export const listSubscriptions = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const filter: any = { organizationId: orgId };
  if (req.query.customerId) filter.customerId = String(req.query.customerId);
  if (req.query.status) filter.status = String(req.query.status);

  const total = await Subscription.countDocuments(filter);
  const rows = await Subscription.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({
    success: true,
    data: rows.map(normalizeRow),
    pagination: { total, page: 1, limit: total, pages: 1 },
  });
};

export const createSubscription = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const created = await Subscription.create({ ...req.body, organizationId: orgId });
  return res.status(201).json({ success: true, data: normalizeRow(created.toObject()) });
};

export const getSubscriptionById = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const row = await Subscription.findOne({ _id: req.params.id, organizationId: orgId }).lean();
  if (!row) return res.status(404).json({ success: false, message: "Not found", data: null });
  return res.json({ success: true, data: normalizeRow(row) });
};

export const updateSubscription = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  const updated = await Subscription.findOneAndUpdate(
    { _id: req.params.id, organizationId: orgId },
    { $set: req.body },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Not found", data: null });
  return res.json({ success: true, data: normalizeRow(updated) });
};

export const deleteSubscription = async (req: any, res: any) => {
  const orgId = req.user?.organizationId;
  await Subscription.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
  return res.json({ success: true, data: { id: req.params.id } });
};
