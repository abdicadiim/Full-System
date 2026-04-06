import { Customer } from "../models/Customer.js";
import mongoose from "mongoose";

const normalizeCustomerIdentity = (value: unknown) => String(value ?? "").trim();

export const isMongoObjectIdString = (value: unknown) => {
  const normalized = normalizeCustomerIdentity(value);
  return Boolean(normalized) && mongoose.isValidObjectId(normalized);
};

export const buildCustomerLookupFilter = (organizationId: string, customerId: unknown) => {
  const normalizedId = normalizeCustomerIdentity(customerId);
  if (!organizationId || !normalizedId) return null;

  const clauses: Record<string, unknown>[] = [{ id: normalizedId }];
  if (isMongoObjectIdString(normalizedId)) {
    clauses.unshift({ _id: normalizedId });
  }

  return {
    organizationId,
    $or: clauses,
  };
};

export const buildCustomerIdsFilter = (organizationId: string, customerIds: unknown[]) => {
  const normalizedIds = (Array.isArray(customerIds) ? customerIds : [])
    .map((value) => normalizeCustomerIdentity(value))
    .filter(Boolean);

  if (!organizationId || !normalizedIds.length) return null;

  const objectIds = normalizedIds.filter((value) => isMongoObjectIdString(value));
  const customIds = normalizedIds.filter((value) => !isMongoObjectIdString(value));
  const clauses: Record<string, unknown>[] = [];

  if (objectIds.length) {
    clauses.push({ _id: { $in: objectIds } });
  }

  if (customIds.length) {
    clauses.push({ id: { $in: customIds } });
  }

  if (!clauses.length) return null;

  return {
    organizationId,
    $or: clauses,
  };
};

export const findCustomerByAnyId = async (organizationId: string, customerId: unknown) => {
  const filter = buildCustomerLookupFilter(organizationId, customerId);
  if (!filter) return null;
  return Customer.findOne(filter).lean();
};
