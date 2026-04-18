/* eslint-disable @typescript-eslint/no-explicit-any */

import { itemsAPI } from "../services/api";

const extractRows = (response: any) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const itemsStore = {
  async list() {
    const response = await itemsAPI.getAll();
    return extractRows(response);
  },
  async get(id: string) {
    const response = await itemsAPI.getById(id);
    return response?.data || null;
  },
  async add(item: any) {
    const response = await itemsAPI.create(item);
    return response?.data || response || null;
  },
  async update(id: string, patch: any) {
    const response = await itemsAPI.update(id, patch);
    return response?.data || response || null;
  },
  async remove(id: string) {
    await itemsAPI.delete(id);
    return true;
  },
};

export default itemsStore;
