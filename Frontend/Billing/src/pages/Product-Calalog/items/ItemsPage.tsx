// src/features/items/ItemsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Loader2, X } from "lucide-react";
import { itemsAPI, tagAssignmentsAPI } from "../../../services/api";
import { Item, DeleteConfirmModal } from "./itemsModel";
import { useLocation, useNavigate } from "react-router-dom";

// Import extracted components
import ItemsList from "./ItemsList";
import ItemSidebar from "./components/ItemSidebar";
import ItemDetails from "./components/ItemDetails";
import NewItemForm from "./components/NewItemForm";
import EditItemForm from "./components/EditItemForm";
import BulkUpdateModal from "./components/modals/BulkUpdateModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePermissions } from "../../../hooks/usePermissions";
import { buildCloneName } from "../utils/cloneName";
import { fetchItemsList, itemQueryKeys, useItemDetailQuery, useItemsListQuery } from "./itemQueries";

function ItemsPageContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<string>("list"); // list | new | detail | edit
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModal>({
    open: false, itemId: null, itemName: null, count: 1, itemIds: null
  });
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [bulkUpdateModal, setBulkUpdateModal] = useState<{ open: boolean, itemIds: string[] }>({
    open: false, itemIds: []
  });
  const [clonedItem, setClonedItem] = useState<any>(null);

  const { baseCurrency } = useCurrency();
  const { canView, canCreate, canEdit, canDelete, loading: permissionsLoading } = usePermissions();

  // FIXED: Removed arguments to match usePermissions hook signature (Expected 0 arguments)
  const canViewItems = canView();
  const canCreateItems = canCreate();
  const canEditItems = canEdit();
  const canDeleteItems = canDelete();

  const ITEMS_STORAGE_KEY = "inv_items_v1";
  const normalizedSelectedId = String(selectedId || "").trim();

  const setRouteHash = useCallback(
    (hash: string) => {
      navigate(
        { pathname: location.pathname, search: location.search, hash: hash || "" },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );

  const normalizeItemForList = (item?: Item | null) => {
    if (!item) return null;

    const normalizedId = String(item.id || item._id || "").trim();
    if (!normalizedId) return null;

    return {
    ...item,
    images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
      id: normalizedId,
      _id: item._id || item.id || normalizedId,
      active: item.active !== undefined ? item.active : item.isActive
    };
  };

  const ensureItemApiSuccess = (response: any, fallbackMessage: string) => {
    if (response && typeof response === "object" && "success" in response && response.success === false) {
      throw new Error((response as any).message || fallbackMessage);
    }
    return response;
  };

  const applyItemsResult = useCallback((rows: any[]) => {
    const normalizedItems = (Array.isArray(rows) ? rows : [])
      .map((item: Item) => normalizeItemForList(item))
      .filter(Boolean) as Item[];
    setItems(normalizedItems);
  }, []);

  const upsertItemInState = useCallback((item: any) => {
    const normalizedItem = normalizeItemForList(item as Item);
    if (!normalizedItem) return null;

    setItems((prev) => {
      const withoutCurrent = prev.filter(
        (row: any) => String(row?.id || row?._id || "").trim() !== normalizedItem.id
      );
      return [normalizedItem, ...withoutCurrent];
    });

    return normalizedItem;
  }, []);

  const itemsListQuery = useItemsListQuery({
    enabled: !permissionsLoading && canViewItems,
  });

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewItems) {
      setLoading(false);
      return;
    }

    if (itemsListQuery.data) {
      applyItemsResult(itemsListQuery.data);
    }
  }, [applyItemsResult, canViewItems, itemsListQuery.data, permissionsLoading]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewItems) {
      setLoading(false);
      return;
    }

    if (itemsListQuery.isPending && items.length === 0) {
      setLoading(true);
      return;
    }

    if (itemsListQuery.data || itemsListQuery.isError) {
      setLoading(false);
    }
  }, [
    canViewItems,
    items.length,
    itemsListQuery.data,
    itemsListQuery.isError,
    itemsListQuery.isPending,
    permissionsLoading,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore local storage sync errors for item cache mirror.
    }
  }, [items]);

  const fetchItems = useCallback(async () => {
    if (!canViewItems) return [];

    if (items.length === 0) {
      setLoading(true);
    }

    try {
      const rows = await queryClient.fetchQuery({
        queryKey: itemQueryKeys.list(),
        queryFn: fetchItemsList,
      });
      applyItemsResult(rows);
      return rows;
    } catch (error) {
      console.error("Failed to fetch items:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [applyItemsResult, canViewItems, items.length, queryClient]);

  const selectedItem = useMemo(
    () =>
      items.find(
        (x: Item) => String(x.id || x._id || "").trim() === normalizedSelectedId
      ) || null,
    [items, normalizedSelectedId]
  );

  const selectedItemQuery = useItemDetailQuery(normalizedSelectedId, {
    enabled: view === "detail" && Boolean(normalizedSelectedId),
    initialItem: selectedItem,
  });

  const resolvedSelectedItem = selectedItemQuery.data || selectedItem || null;

  useEffect(() => {
    if (resolvedSelectedItem) {
      upsertItemInState(resolvedSelectedItem);
    }
  }, [resolvedSelectedItem, upsertItemInState]);

  const handleSelectItem = useCallback((id: string) => {
    const nextId = String(id || "").trim();
    if (!nextId) return;

    setSelectedId(nextId);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!normalizedSelectedId) return;
    if (view === "detail") {
      setRouteHash("detail");
      return;
    }

    setView("detail");
    setRouteHash("detail");
  }, [normalizedSelectedId, setRouteHash, view]);

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
      const response = ensureItemApiSuccess(await itemsAPI.create(data), "Failed to save item");

      const newItem = response.data || response;
      const normalizedItem = upsertItemInState(newItem as Item);
      const normalizedId = String(normalizedItem?.id || normalizedItem?._id || "");
      if (!normalizedId) {
        throw new Error("Item saved without id");
      }

      const itemId = newItem._id || newItem.id;

      if (tagIds && tagIds.length > 0 && itemId) {
        try {
          await tagAssignmentsAPI.assignTags({
            entityType: "Item",
            entityId: itemId,
            tagIds: tagIds,
          });
        } catch (tagError) {
          console.error("Failed to assign tags:", tagError);
        }
      }

      if (!options?.stayOnCurrent) {
        if (view === "detail") {
          setSelectedId(String(newItem._id || newItem.id));
        } else {
          setView("list");
        }
      }
      setClonedItem(null);
      toast.success("Item created successfully");
      await fetchItems();
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
    const targetId = String(selectedItem?.id || selectedItem?._id || selectedId || "").trim();
    if (!targetId) {
      toast.error("No item selected for editing.");
      return;
    }
    try {
      const safeSelected = { ...(selectedItem || {}) } as any;
      const safeData = { ...(data || {}) } as any;
      delete safeSelected.id;
      delete safeSelected._id;
      delete safeSelected.createdAt;
      delete safeSelected.updatedAt;
      delete safeSelected.__v;
      delete safeData.id;
      delete safeData._id;
      delete safeData.createdAt;
      delete safeData.updatedAt;
      delete safeData.__v;

      const requestedStatus =
        typeof safeData.active === "boolean"
          ? safeData.active
          : typeof safeData.isActive === "boolean"
            ? safeData.isActive
            : typeof safeData.status === "string"
              ? safeData.status.toLowerCase() === "active"
              : null;
      const updateKeys = Object.keys(safeData);
      const isStatusOnlyUpdate =
        requestedStatus !== null &&
        updateKeys.length > 0 &&
        updateKeys.every((key) => ["active", "isActive", "status"].includes(key));

      const response = isStatusOnlyUpdate
        ? requestedStatus
          ? await itemsAPI.markActive(targetId)
          : await itemsAPI.markInactive(targetId)
        : await itemsAPI.update(targetId, {
            ...safeSelected,
            ...safeData,
          });

      ensureItemApiSuccess(response, "Failed to update item");
      await fetchItems();
      setSelectedId(targetId);
      setView("detail");
      toast.success("Item updated successfully");
    } catch (error: any) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item: " + (error.message || "Unknown error"));
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
    setIsDeletingItems(true);
    try {
      ensureItemApiSuccess(await itemsAPI.delete(deleteConfirmModal.itemId), "Failed to delete item");
      await fetchItems();
      if (selectedId === deleteConfirmModal.itemId) {
        setSelectedId(null);
        setView("list");
      }
      toast.success("Item deleted successfully");
      setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
    } catch (error: any) {
      toast.error("Failed to delete item: " + (error?.message || "Unknown error"));
    } finally {
      setIsDeletingItems(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    if (!deleteConfirmModal.itemIds || deleteConfirmModal.itemIds.length === 0) return;
    setIsDeletingItems(true);
    try {
      await Promise.all(
        deleteConfirmModal.itemIds.map(async (id) =>
          ensureItemApiSuccess(await itemsAPI.delete(id), "Failed to delete item")
        )
      );
      await fetchItems();
      if (deleteConfirmModal.itemIds.includes(selectedId || "")) {
        setSelectedId(null);
        setView("list");
      }
      toast.success(`${deleteConfirmModal.itemIds.length} item(s) deleted successfully`);
      setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
    } catch (error: any) {
      toast.error("Bulk delete failed: " + (error?.message || "Unknown error"));
    } finally {
      setIsDeletingItems(false);
    }
  };

  const handleBulkMarkActive = async (ids: string[]) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      await Promise.all(
        ids.map(async (id) => ensureItemApiSuccess(await itemsAPI.markActive(id), "Failed to mark item active"))
      );
      await fetchItems();
      toast.success(`${ids.length} item(s) marked as active`);
    } catch (e: any) { toast.error(e?.message || "Bulk action failed"); }
  };

  const handleBulkMarkInactive = async (ids: string[]) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      await Promise.all(
        ids.map(async (id) => ensureItemApiSuccess(await itemsAPI.markInactive(id), "Failed to mark item inactive"))
      );
      await fetchItems();
      toast.success(`${ids.length} item(s) marked as inactive`);
    } catch (e: any) { toast.error(e?.message || "Bulk action failed"); }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      setLoading(true);
      await Promise.all(
        bulkUpdateModal.itemIds.map(async (id) =>
          ensureItemApiSuccess(await itemsAPI.update(id, { [field]: value }), "Bulk update failed")
        )
      );
      await fetchItems();
      toast.success(`${bulkUpdateModal.itemIds.length} item(s) updated successfully`);
      setBulkUpdateModal({ open: false, itemIds: [] });
    } catch (e: any) {
      toast.error(e?.message || "Bulk update failed");
      setLoading(false);
    }
  };

  const openNewView = () => {
    setView("new");
    setSelectedId(null);
    setRouteHash("new");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedId(null);
    setClonedItem(null);
    setRouteHash("");
  };

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

    await handleCreateItem(clonedPayload, [], { stayOnCurrent: true });
  };

  if (permissionsLoading) {
    return (
      <div className="w-full p-8 text-center text-gray-500">Loading permissions...</div>
    );
  }

  if (!canViewItems) {
    return (
      <div className="w-full p-8">
        <div className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          You do not have permission to view Items.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {view === "detail" && normalizedSelectedId ? (
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="hidden md:flex w-full md:w-1/5 border-r border-gray-200 bg-white flex-col z-20">
              <ItemSidebar
              items={items}
              selectedId={selectedId}
              onSelect={handleSelectItem}
              onNew={() => { if (canCreateItems) openNewView(); }}
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
            {resolvedSelectedItem ? (
              <ItemDetails
                item={resolvedSelectedItem as Item}
                onBack={handleBackToList}
                onEdit={() => { if (canEditItems) { setView("edit"); setRouteHash("edit"); } }}
                onUpdate={handleUpdateItem}
                items={items}
                setItems={setItems}
                onDelete={handleDeleteItem}
                setSelectedId={setSelectedId}
                setView={setView}
                onClone={handleCloneItem}
                baseCurrency={baseCurrency}
                canCreate={canCreateItems}
                canEdit={canEditItems}
                canDelete={canDeleteItems}
              />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center px-6">
                {selectedItemQuery.isPending ? (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Loader2 size={18} className="animate-spin" />
                    Loading item details...
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">We couldn't open that item.</p>
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Back to Items
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`w-full h-full ${view === "list" ? "overflow-hidden" : "overflow-visible"}`}>
          {view === "list" && (
            <ItemsList
              items={items}
              onSelect={handleSelectItem}
              onNew={() => { if (canCreateItems) openNewView(); }}
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

          {view === "edit" && resolvedSelectedItem && canEditItems && (
            <EditItemForm
              onCancel={() => { setView("detail"); setRouteHash("detail"); }}
              onUpdate={handleUpdateItem}
              baseCurrency={baseCurrency}
              item={resolvedSelectedItem as Item}
              formTitle="Edit Item"
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
              <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                !
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                {deleteConfirmModal.count > 1
                  ? `Delete ${deleteConfirmModal.count} item${deleteConfirmModal.count === 1 ? "" : "s"}?`
                  : "Delete item?"}
              </h3>
              <button
                type="button"
                className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => {
                  if (isDeletingItems) return;
                  setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
                }}
                aria-label="Close"
                disabled={isDeletingItems}
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-3 text-[13px] text-slate-600">
              {deleteConfirmModal.count > 1 ? (
                <>You cannot retrieve these items once they have been deleted.</>
              ) : (
                <>
                  You cannot retrieve this item once it has been deleted.
                  <div className="mt-2 font-medium text-slate-700">
                    {deleteConfirmModal.itemName ? `"${deleteConfirmModal.itemName}"` : "This item"} will be permanently removed.
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className={`px-4 py-1.5 rounded-md bg-blue-600 text-white text-[12px] hover:bg-blue-700 flex items-center gap-2 ${isDeletingItems ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={() => deleteConfirmModal.itemIds ? confirmBulkDelete() : confirmDeleteItem()}
                disabled={isDeletingItems}
              >
                {isDeletingItems && <Loader2 size={14} className="animate-spin" />}
                {isDeletingItems ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50 ${isDeletingItems ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (isDeletingItems) return;
                  setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
                }}
                disabled={isDeletingItems}
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
