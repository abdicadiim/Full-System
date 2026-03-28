import { ActivityLog } from "../models/ActivityLog.js";

export type ActivityLogInput = {
  organizationId: string;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action?: string;
  resource?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  method?: string;
  path?: string;
  summary?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
  occurredAt?: Date;
};

export const recordActivity = async (input: ActivityLogInput): Promise<void> => {
  const organizationId = String(input.organizationId || "").trim();
  const actorId = String(input.actorId || "").trim();
  if (!organizationId || !actorId) return;

  try {
    await ActivityLog.create({
      organizationId,
      actorId,
      actorName: String(input.actorName || ""),
      actorEmail: String(input.actorEmail || ""),
      actorRole: String(input.actorRole || ""),
      action: String(input.action || ""),
      resource: String(input.resource || ""),
      entityType: String(input.entityType || ""),
      entityId: String(input.entityId || ""),
      entityName: String(input.entityName || ""),
      method: String(input.method || ""),
      path: String(input.path || ""),
      summary: String(input.summary || ""),
      details: input.details || {},
      statusCode: Number(input.statusCode || 0),
      occurredAt: input.occurredAt || new Date(),
    });
  } catch (error) {
    // Keep activity logging non-blocking.
    console.error("Failed to persist activity log:", error);
  }
};
