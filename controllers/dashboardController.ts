import type express from "express";
import mongoose from "mongoose";
import { getDashboardSummaryPayload } from "../services/dashboardSummaryService.js";

const normalizeHttpDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getDashboardSummary: express.RequestHandler = async (req, res) => {
  const orgId = (req as any).user?.organizationId;
  if (!orgId) {
    return res.status(401).json({ success: false, message: "Unauthenticated", data: null });
  }
  if (!mongoose.isValidObjectId(orgId)) {
    return res.status(400).json({ success: false, message: "Invalid organization", data: null });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ success: false, message: "Database not connected", data: null });
  }

  const { payloadData, versionId, lastUpdated } = await getDashboardSummaryPayload(orgId);
  const etag = `"${versionId}"`;
  const lastModified = new Date(lastUpdated).toUTCString();
  const ifNoneMatch = String(req.header("If-None-Match") || "").trim();
  const ifModifiedSince = normalizeHttpDate(req.header("If-Modified-Since"));
  const lastUpdatedDate = new Date(lastUpdated);
  const matchesEtag =
    Boolean(ifNoneMatch) &&
    ifNoneMatch
      .split(",")
      .map((value) => value.trim())
      .includes(etag);
  const notModifiedByDate = Boolean(ifModifiedSince) && lastUpdatedDate.getTime() <= (ifModifiedSince?.getTime() || 0);

  res.set({
    ETag: etag,
    "Last-Modified": lastModified,
    "Cache-Control": "private, no-cache, must-revalidate",
    Vary: "Authorization, If-None-Match, If-Modified-Since",
    "X-Version-Id": versionId,
    "X-Last-Updated": lastUpdated,
  });

  if (matchesEtag || notModifiedByDate) {
    return res.status(304).end();
  }

  return res.json({
    success: true,
    data: {
      ...payloadData,
      version_id: versionId,
      last_updated: lastUpdated,
    },
  });
};
