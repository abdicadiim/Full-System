// src/features/items/ItemsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { itemsAPI, tagAssignmentsAPI } from "../../services/api";
import { Item, DeleteConfirmModal } from "./itemsModel";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";

// Import extracted components
import ItemsList from "./ItemsList";
import ItemSidebar from "./components/ItemSidebar";
import ItemDetails from "./components/ItemDetails";
import NewItemForm from "./components/NewItemForm";
import BulkUpdateModal from "./components/modals/BulkUpdateModal";
import { useCurrency } from "../../hooks/useCurrency";
import { usePermissions } from "../../hooks/usePermissions";
import { waitForBackendReady } from "../../services/backendReady";
import { buildCloneName } from "./utils/cloneName";

const ITEM_THUMBNAIL_CACHE = new Map<string, string>();
const ITEM_THUMBNAIL_STORAGE_KEY = "inv_item_thumbs_v1";
const ITEM_THUMBNAIL_STORE: Record<string, string> = (() => {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(ITEM_THUMBNAIL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
})();

const getStoredThumbnail = (source: string) => {
  if (!source) return "";
  return ITEM_THUMBNAIL_STORE[source] || "";
};

const setStoredThumbnail = (source: string, thumbnail: string) => {
  if (!source || !thumbnail) return;
  ITEM_THUMBNAIL_STORE[source] = thumbnail;
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ITEM_THUMBNAIL_STORAGE_KEY, JSON.stringify(ITEM_THUMBNAIL_STORE));
  } catch {
    // ignore storage errors
  }
};

function getPrimaryItemImage(item: any) {
  const sources = [
    ...(Array.isArray(item?.images) ? item.images : []),
    item?.thumbnail,
    item?.previewImage,
    item?.imageThumbnail,
    item?.imageUrl,
    item?.imageURL,
    item?.image,
    item?.picture,
  ];
  const source = sources.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof source === "string" ? source.trim() : "";
}

function createThumbnailFromImage(source: string, size = 48): Promise<string> {
  const cached = ITEM_THUMBNAIL_CACHE.get(source);
  if (cached) return Promise.resolve(cached);
  const stored = getStoredThumbnail(source);
  if (stored) {
    ITEM_THUMBNAIL_CACHE.set(source, stored);
    return Promise.resolve(stored);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(source);
          return;
        }
        ctx.clearRect(0, 0, size, size);
        const ratio = Math.min(size / img.width, size / img.height);
        const drawWidth = Math.max(1, Math.round(img.width * ratio));
        const drawHeight = Math.max(1, Math.round(img.height * ratio));
        const x = Math.floor((size - drawWidth) / 2);
        const y = Math.floor((size - drawHeight) / 2);
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        const thumbnail = canvas.toDataURL("image/png", 0.82);
        ITEM_THUMBNAIL_CACHE.set(source, thumbnail);
        setStoredThumbnail(source, thumbnail);
        resolve(thumbnail);
      } catch {
        resolve(source);
      }
    };
    img.onerror = () => resolve(source);
    img.src = source;
  });
}

function collectItemImages(item: any) {
  const candidates = [
    ...(Array.isArray(item?.images) ? item.images : []),
    item?.thumbnail,
    item?.previewImage,
    item?.imageThumbnail,
    item?.imageUrl,
    item?.imageURL,
    item?.image,
    item?.picture,
  ];
  return candidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function ItemsPageContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const ITEMS_STORAGE_KEY = "inv_items_v1";
  const ITEMS_SELECTED_KEY = "inv_items_selected_id_v1";
  const readStoredItems = (): Item[] => {
    try {
      const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const readStoredSelectedId = (): string | null => {
    try {
      const raw = localStorage.getItem(ITEMS_SELECTED_KEY);
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  };

  const initialHash = String(location.hash || "").replace("#", "");
  const initialView =
    initialHash === "detail" || initialHash === "new" || initialHash === "edit"
      ? initialHash
      : "list";
  const initialSelectedId =
    initialView === "detail" || initialView === "edit" ? readStoredSelectedId() : null;

  const [items, setItems] = useState<Item[]>(() => readStoredItems());
  const [loading, setLoading] = useState<boolean>(() => readStoredItems().length === 0);
  const [view, setView] = useState<string>(initialView); // list | new | detail | edit
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detailSnapshot, setDetailSnapshot] = useState<Item | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModal>({
    open: false, itemId: null, itemName: null, count: 1, itemIds: null
  });
  const [bulkUpdateModal, setBulkUpdateModal] = useState<{ open: boolean, itemIds: string[] }>({
    open: false, itemIds: []
  });
  const [clonedItem, setClonedItem] = useState<any>(null);

  const { baseCurrency } = useCurrency();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateItems = canCreate();
  const canEditItems = canEdit();
  const canDeleteItems = canDelete();

  const normalizeItemForList = (item: Item) => {
    const primaryImage = getPrimaryItemImage(item) || (item as any).thumbnail || "";
    const cachedThumb = primaryImage ? getStoredThumbnail(primaryImage) : "";
    return {
      ...item,
      images: collectItemImages(item),
      id: item.id || item._id,
      active: item.active !== undefined ? item.active : item.isActive,
      thumbnail: cachedThumb || primaryImage || ""
    };
  };

  const extractItemRows = (response: any): Item[] => {
    const rows = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
    return rows as Item[];
  };

  const itemsQuery = useQuery({
    queryKey: ["items", "list"],
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    initialData: readStoredItems().length > 0 ? readStoredItems().map((item) => normalizeItemForList(item)) : undefined,
    queryFn: async () => {
      if ((import.meta as any).env?.DEV) {
        await waitForBackendReady();
      }
      const response = await itemsAPI.getAll();
      const itemsData = extractItemRows(response);
      return itemsData.map((item: Item) => normalizeItemForList(item));
    },
  });

  const fetchItems = async () => {
    await itemsQuery.refetch();
  };

  useEffect(() => {
    const nextItems = itemsQuery.data || [];
    setItems(nextItems);
    setLoading(Boolean(itemsQuery.isPending && nextItems.length === 0));
  }, [itemsQuery.data, itemsQuery.isPending]);

  useEffect(() => {
    if (!items.length) return;

    const cancellers: Array<() => void> = [];
    const visibleItems = items.slice(0, 8);

    visibleItems.forEach((item, index) => {
      const primaryImage = getPrimaryItemImage(item);
      if (!primaryImage || (item as any).thumbnail) return;

      const warmThumbnail = () => {
        void createThumbnailFromImage(primaryImage).then((thumbnail) => {
          if (!thumbnail || thumbnail === primaryImage) return;
          setItems((prev) =>
            prev.map((current) =>
              (current.id || current._id) === (item.id || item._id)
                ? { ...current, thumbnail }
                : current
            )
          );
        });
      };

      const id = window.setTimeout(warmThumbnail, index * 50);
      cancellers.push(() => window.clearTimeout(id));
    });

    return () => {
      cancellers.forEach((cancel) => cancel());
    };
  }, [items]);

  const selectedItem = useMemo(
    () => items.find((x: Item) => x.id === selectedId || x._id === selectedId) || null,
    [items, selectedId]
  );
  const detailItem = selectedItem || detailSnapshot;

  useEffect(() => {
    if (!selectedItem) return;
    setDetailSnapshot(selectedItem);
  }, [selectedItem]);

  const handleCreateItem = async (
    data: any,
    tagIds: string[] = [],
    options?: { stayOnCurrent?: boolean }
  ) => {
    if (!canCreateItems) {
      toast.error("You do not have permission to create items.");
      return;
    }
    try {
      const response = await itemsAPI.create(data);
      if (response && "success" in response && response.success === false) {
        throw new Error((response as any).message || "Failed to save item locally");
      }

      const newItem = response.data || response;
      const createImages = collectItemImages({ ...(newItem || {}), ...(data || {}) });
      const createThumbnailSource = createImages[0] || "";
      const normalizedItem = normalizeItemForList({
        ...(newItem as any),
        ...(data || {}),
        images: createImages.length > 0 ? createImages : collectItemImages(newItem),
        thumbnail: createThumbnailSource,
      } as Item);
      const normalizedId = String(normalizedItem.id || normalizedItem._id || "");
      if (!normalizedId) {
        throw new Error("Item saved without id");
      }

      // Ensure localStorage has the new item (hard guarantee for offline/local flow).
      try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(existing) ? existing : [];
        const withoutCurrent = rows.filter((row: any) => String(row?.id || row?._id) !== normalizedId);
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify([normalizedItem, ...withoutCurrent]));
      } catch (storageError) {
        console.error("Local storage sync failed:", storageError);
      }

      // Immediately reflect in UI list before refresh.
      setItems((prev) => {
        const withoutCurrent = prev.filter(
          (row: any) => String(row?.id || row?._id) !== normalizedId
        );
        return [normalizedItem, ...withoutCurrent];
      });

      if (!options?.stayOnCurrent) {
        if (view === "detail") {
          rememberSelectedId(String(newItem._id || newItem.id));
        } else {
          setView("list");
        }
      }
      setClonedItem(null);
      toast.success("Item created successfully");

      const itemId = newItem._id || newItem.id;

      if (tagIds && tagIds.length > 0 && itemId) {
        void tagAssignmentsAPI.assignTags({
          entityType: "Item",
          entityId: itemId,
          tagIds: tagIds,
        }).catch((tagError) => {
          console.error("Failed to assign tags:", tagError);
        });
      }
      // Final sync from local store/API without blocking the save flow.
      void fetchItems();
    } catch (error: any) {
      console.error("Failed to create item:", error);
      toast.error("Failed to create item: " + (error.message || "Unknown error"));
      throw error;
    }
  };

  const handleUpdateItem = async (data: any) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    if (!selectedId) return;
    const targetId = String(selectedId);
    const prevItems = items;
    const optimisticUpdate = (list: Item[]) =>
      list.map((row: any) =>
        String(row?.id || row?._id) === targetId ? { ...row, ...data } : row
      );
    try {
      // Optimistic update so the UI (including Mark as Active/Inactive label) updates immediately.
      setItems((prev) => optimisticUpdate(prev));
      setDetailSnapshot((prev) => (prev && (String(prev.id || (prev as any)._id) === targetId) ? { ...prev, ...data } : prev));
      try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(existing) ? existing : [];
        const nextRows = optimisticUpdate(rows as Item[]);
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // ignore storage errors
      }

      const toastId = toast.success("Item updated successfully");

      await itemsAPI.update(selectedId, data);
      await fetchItems();
      setView("detail");
      toast.update(toastId, { render: "Item updated successfully", type: "success", autoClose: 2000 });
    } catch (error: any) {
      console.error("Failed to update item:", error);
      setItems(prevItems);
      setDetailSnapshot((prev) => {
        if (!prev) return prev;
        const restore = prevItems.find((row: any) => String(row?.id || row?._id) === targetId);
        return restore ? (restore as Item) : prev;
      });
      try {
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(prevItems));
      } catch {
        // ignore storage errors
      }
      toast.update(toastId, {
        render: "Failed to update item: " + (error.message || "Unknown error"),
        type: "error",
        autoClose: 3000,
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    const item = items.find(i => i.id === id || i._id === id);
    setDeleteConfirmModal({ open: true, itemId: id, itemName: item?.name || "this item", count: 1, itemIds: null });
  };

  const confirmDeleteItem = async () => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    if (!deleteConfirmModal.itemId) return;
    const deleteId = deleteConfirmModal.itemId;
    const prevItems = items;
    try {
      // Optimistic UI update
      setItems((prev) => prev.filter((row: any) => String(row?.id || row?._id) !== String(deleteId)));
      try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(existing) ? existing : [];
        const nextRows = rows.filter((row: any) => String(row?.id || row?._id) !== String(deleteId));
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // ignore storage errors
      }

      if (selectedId === deleteId) {
        rememberSelectedId(null);
        setView("list");
        setDetailSnapshot(null);
      }
      setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
      toast.success("Item deleted successfully");

      await itemsAPI.delete(deleteId);
      void fetchItems();
    } catch (error: any) {
      // Restore on failure
      setItems(prevItems);
      try {
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(prevItems));
      } catch {
        // ignore storage errors
      }
      toast.error("Failed to delete item");
    }
  };

  const confirmBulkDelete = async () => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    if (!deleteConfirmModal.itemIds || deleteConfirmModal.itemIds.length === 0) return;
    const idsToDelete = deleteConfirmModal.itemIds.map((id) => String(id));
    const prevItems = items;
    try {
      // Optimistic UI update
      setItems((prev) => prev.filter((row: any) => !idsToDelete.includes(String(row?.id || row?._id))));
      try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(existing) ? existing : [];
        const nextRows = rows.filter((row: any) => !idsToDelete.includes(String(row?.id || row?._id)));
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // ignore storage errors
      }

      if (selectedId && idsToDelete.includes(String(selectedId))) {
        rememberSelectedId(null);
        setView("list");
        setDetailSnapshot(null);
      }
      setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
      toast.success(`${idsToDelete.length} item(s) deleted successfully`);

      await Promise.all(idsToDelete.map(id => itemsAPI.delete(id)));
      void fetchItems();
    } catch (error: any) {
      setItems(prevItems);
      try {
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(prevItems));
      } catch {
        // ignore storage errors
      }
      toast.error("Bulk delete failed");
    }
  };

  const handleBulkMarkActive = async (ids: string[]) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      await Promise.all(ids.map(id => itemsAPI.update(id, { active: true, isActive: true, status: "Active" })));
      await fetchItems();
      toast.success(`${ids.length} item(s) marked as active`);
    } catch (e) { toast.error("Bulk action failed"); }
  };

  const handleBulkMarkInactive = async (ids: string[]) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      await Promise.all(ids.map(id => itemsAPI.update(id, { active: false, isActive: false, status: "Inactive" })));
      await fetchItems();
      toast.success(`${ids.length} item(s) marked as inactive`);
    } catch (e) { toast.error("Bulk action failed"); }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      setLoading(true);
      await Promise.all(bulkUpdateModal.itemIds.map(id => itemsAPI.update(id, { [field]: value })));
      await fetchItems();
      toast.success(`${bulkUpdateModal.itemIds.length} item(s) updated successfully`);
      setBulkUpdateModal({ open: false, itemIds: [] });
    } catch (e) {
      toast.error("Bulk update failed");
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView("list");
    rememberSelectedId(null);
    setClonedItem(null);
    setDetailSnapshot(null);
  };

  const rememberSelectedId = (id: string | null) => {
    setSelectedId(id);
    try {
      if (id) {
        localStorage.setItem(ITEMS_SELECTED_KEY, String(id));
      } else {
        localStorage.removeItem(ITEMS_SELECTED_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  // Keep a tiny URL signal while inside the Items module.
  // This lets a global sidebar click to `/products/items` reliably reset the view back to the list
  // even if this page is already mounted (detail/new/edit are state-driven).
  useEffect(() => {
    const desiredHash = view === "list" ? "" : `#${view}`;
    if (location.hash === desiredHash) return;
    navigate({ pathname: location.pathname, search: location.search, hash: desiredHash }, { replace: true });
    // Intentionally do not depend on `location.hash` so external hash changes can drive state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, navigate, location.pathname, location.search]);

  // If the URL hash is cleared (ex: user clicks "Items" in the global sidebar),
  // force the list view.
  useEffect(() => {
    if (location.hash) return;
    if (view === "list") return;
    handleBackToList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  // Restore detail/edit view on refresh when hash is present
  useEffect(() => {
    const hash = String(location.hash || "");
    if (hash !== "#detail" && hash !== "#edit") return;
    if (selectedId) return;
    const storedId = readStoredSelectedId();
    if (!storedId) return;
    setView(hash === "#edit" ? "edit" : "detail");
    rememberSelectedId(storedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, selectedId]);

  const handleCloneItem = async (data: any) => {
    if (!canCreateItems) {
      toast.error("You do not have permission to create items.");
      return;
    }

    const baseName = String(data?.name || "Item").trim();
    const baseSku = String(data?.sku || "").trim();
    const clonedPayload: any = {
      ...data,
      name: buildCloneName(
        baseName,
        items.map((row: any) => String(row?.name || "")),
        "Item"
      ),
      sku: baseSku ? `${baseSku}-COPY` : "",
    };

    // Remove identifiers so it creates a new record.
    delete clonedPayload.id;
    delete clonedPayload._id;
    delete clonedPayload.__v;
    delete clonedPayload.createdAt;
    delete clonedPayload.updatedAt;

    const optimisticId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticItem = normalizeItemForList({
      ...clonedPayload,
      id: optimisticId,
      _id: optimisticId,
    } as Item);

    // Optimistically update list and local storage for instant feedback.
    setItems((prev) => {
      const withoutCurrent = prev.filter(
        (row: any) => String(row?.id || row?._id) !== optimisticId
      );
      return [optimisticItem, ...withoutCurrent];
    });
    try {
      const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(existing) ? existing : [];
      const withoutCurrent = rows.filter((row: any) => String(row?.id || row?._id) !== optimisticId);
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify([optimisticItem, ...withoutCurrent]));
    } catch {
      // ignore storage errors
    }

    const toastId = toast.success("Item cloned successfully");

    try {
      const response = await itemsAPI.create(clonedPayload);
      if (response && "success" in response && response.success === false) {
        throw new Error((response as any).message || "Failed to save item");
      }
      const newItem = response.data || response;
      const createImages = collectItemImages({ ...(newItem || {}), ...(clonedPayload || {}) });
      const createThumbnailSource = createImages[0] || "";
      const normalizedItem = normalizeItemForList({
        ...(newItem as any),
        ...(clonedPayload || {}),
        images: createImages.length > 0 ? createImages : collectItemImages(newItem),
        thumbnail: createThumbnailSource,
      } as Item);
      const normalizedId = String(normalizedItem.id || normalizedItem._id || "");

      setItems((prev) =>
        prev.map((row: any) =>
          String(row?.id || row?._id) === optimisticId ? normalizedItem : row
        )
      );

      try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(existing) ? existing : [];
        const nextRows = rows.map((row: any) =>
          String(row?.id || row?._id) === optimisticId ? normalizedItem : row
        );
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // ignore storage errors
      }

      if (selectedId === optimisticId && normalizedId) {
        rememberSelectedId(normalizedId);
      }

      void fetchItems();
    } catch (error: any) {
      console.error("Failed to clone item:", error);
      setItems((prev) => prev.filter((row: any) => String(row?.id || row?._id) !== optimisticId));
      try {
        const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(existing) ? existing : [];
        const nextRows = rows.filter((row: any) => String(row?.id || row?._id) !== optimisticId);
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(nextRows));
      } catch {
        // ignore storage errors
      }
      toast.update(toastId, {
        render: "Failed to clone item",
        type: "error",
        autoClose: 3000,
      });
    }
  };

  return (
    <div className="w-full h-full">
      {view === "detail" && detailItem ? (
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="hidden md:flex w-full md:w-1/5 border-r border-gray-200 bg-white flex-col z-20">
            <ItemSidebar
              items={items}
              selectedId={selectedId}
              onSelect={(id: string) => { rememberSelectedId(id); setView("detail"); window.scrollTo(0, 0); }}
              onNew={() => { if (canCreateItems) { setView("new"); rememberSelectedId(null); } }}
              baseCurrency={baseCurrency}
              onBulkMarkActive={handleBulkMarkActive}
              onBulkMarkInactive={handleBulkMarkInactive}
              onBulkDelete={async (ids: string[]) => setDeleteConfirmModal({ open: true, itemId: null, itemName: null, count: ids.length, itemIds: ids })}
              onBulkUpdate={(ids: string[]) => setBulkUpdateModal({ open: true, itemIds: ids })}
              canCreate={canCreateItems}
              canEdit={canEditItems}
              canDelete={canDeleteItems}
            />
          </div>
          <div className="flex-1 bg-white overflow-auto w-full">
            <ItemDetails
              item={detailItem as Item}
              onBack={handleBackToList}
              onEdit={() => { if (canEditItems) setView("edit"); }}
              onUpdate={handleUpdateItem}
              items={items}
              setItems={setItems}
              onDelete={handleDeleteItem}
              setSelectedId={rememberSelectedId}
              setView={setView}
              onClone={handleCloneItem}
              baseCurrency={baseCurrency}
              canCreate={canCreateItems}
              canEdit={canEditItems}
              canDelete={canDeleteItems}
            />
          </div>
        </div>
      ) : (
        <div className={`w-full h-full ${view === "list" ? "overflow-hidden" : "overflow-visible"}`}>
          {view === "list" && (
            <ItemsList
              items={items}
              onSelect={(id: string) => { rememberSelectedId(id); setView("detail"); window.scrollTo(0, 0); }}
              onNew={() => { if (canCreateItems) { setView("new"); rememberSelectedId(null); } }}
              onDelete={handleDeleteItem}
              onBulkDelete={async (ids: string[]) => setDeleteConfirmModal({ open: true, itemId: null, itemName: null, count: ids.length, itemIds: ids })}
              onBulkUpdate={(ids: string[]) => setBulkUpdateModal({ open: true, itemIds: ids })}
              onBulkMarkActive={handleBulkMarkActive}
              onBulkMarkInactive={handleBulkMarkInactive}
              onRefresh={fetchItems}
              baseCurrency={baseCurrency}
              isLoading={loading}
              canCreate={canCreateItems}
              canEdit={canEditItems}
              canDelete={canDeleteItems}
            />
          )}

          {view === "new" && canCreateItems && (
            <NewItemForm
              onCancel={handleBackToList}
              onCreate={handleCreateItem}
              baseCurrency={baseCurrency}
              initialData={clonedItem}
            />
          )}

          {view === "edit" && selectedItem && canEditItems && (
            <NewItemForm
              onCancel={() => setView("detail")}
              onCreate={async (data: any) => {
                await handleUpdateItem({
                  ...selectedItem,
                  ...data,
                  id: selectedItem.id || selectedItem._id,
                  _id: selectedItem._id || selectedItem.id,
                });
              }}
              baseCurrency={baseCurrency}
              initialData={selectedItem}
              formTitle="Edit Item"
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                Delete {deleteConfirmModal.count > 1 ? `${deleteConfirmModal.count} item(s)` : "item"}?
              </h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null })}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              {deleteConfirmModal.count > 1
                ? "You cannot retrieve these items once they have been deleted."
                : "You cannot retrieve this item once it has been deleted."}
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700"
                onClick={() => deleteConfirmModal.itemIds ? confirmBulkDelete() : confirmDeleteItem()}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                onClick={() => setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {bulkUpdateModal.open && (
        <BulkUpdateModal
          selectedCount={bulkUpdateModal.itemIds.length}
          onClose={() => setBulkUpdateModal({ open: false, itemIds: [] })}
          onUpdate={handleBulkUpdate}
        />
      )}
    </div>
  );
}

export default function ItemsPage() {
  return <ItemsPageContent />;
}
