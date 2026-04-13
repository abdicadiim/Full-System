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
import BulkUpdateModal from "./components/modals/BulkUpdateModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePermissions } from "../../../hooks/usePermissions";
import { buildCloneName } from "../utils/cloneName";
import { fetchItemsList, itemQueryKeys, useItemDetailQuery, useItemsListQuery } from "./itemQueries";
import LoadingSpinner from "../../../components/LoadingSpinner";

function ItemsPageContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const initialSelectedId = String(params.get("itemId") || "").trim();
    return initialSelectedId || null;
  });
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
  const shouldLoadItemsQuery = permissionsLoading || canViewItems;
  const showCachedListWhilePermissionsLoad = permissionsLoading && items.length > 0;
  const resolvedCanViewItems = showCachedListWhilePermissionsLoad ? true : canViewItems;
  const resolvedCanCreateItems = permissionsLoading ? false : canCreateItems;
  const resolvedCanEditItems = permissionsLoading ? false : canEditItems;
  const resolvedCanDeleteItems = permissionsLoading ? false : canDeleteItems;
  const routeSelectedId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get("itemId") || "").trim();
  }, [location.search]);
  const normalizedSelectedId = String(selectedId || "").trim();
  const routeHash = String(location.hash || "").replace(/^#/, "").trim().toLowerCase();
  const currentView = useMemo(() => {
    if (routeHash === "new") return "new";
    if (routeHash === "edit" && normalizedSelectedId) return "edit";
    if (routeHash === "detail" && normalizedSelectedId) return "detail";
    return "list";
  }, [normalizedSelectedId, routeHash]);

  const setRouteState = useCallback(
    ({ hash, itemId }: { hash?: string; itemId?: string | null }) => {
      const params = new URLSearchParams(location.search);
      const normalizedItemId = String(itemId || "").trim();

      if (normalizedItemId) {
        params.set("itemId", normalizedItemId);
      } else {
        params.delete("itemId");
      }

      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : "",
          hash: hash || "",
        },
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
    enabled: shouldLoadItemsQuery,
  });

  useEffect(() => {
    if (!permissionsLoading && !canViewItems) {
      setLoading(false);
      setLoadError(null);
      return;
    }

    if (itemsListQuery.data) {
      setLoadError(null);
      applyItemsResult(itemsListQuery.data);
    }
  }, [applyItemsResult, canViewItems, itemsListQuery.data, permissionsLoading]);

  useEffect(() => {
    if (!permissionsLoading && !canViewItems) {
      setLoading(false);
      setLoadError(null);
      return;
    }

    if (itemsListQuery.isPending && items.length === 0) {
      setLoading(true);
      setLoadError(null);
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

  const fetchItems = useCallback(async () => {
    if (!canViewItems) return [];

    if (items.length === 0) {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const rows = await queryClient.fetchQuery({
        queryKey: itemQueryKeys.list(),
        queryFn: fetchItemsList,
        staleTime: 0,
      });
      applyItemsResult(rows);
      return rows;
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load items");
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
    enabled: (currentView === "detail" || currentView === "edit") && Boolean(normalizedSelectedId),
    initialItem: selectedItem,
  });

  const resolvedSelectedItem = selectedItemQuery.data || selectedItem || null;

  useEffect(() => {
    if (resolvedSelectedItem) {
      upsertItemInState(resolvedSelectedItem);
    }
  }, [resolvedSelectedItem, upsertItemInState]);

  useEffect(() => {
    setSelectedId(routeSelectedId || null);
  }, [routeSelectedId]);

  const handleSelectItem = useCallback((id: string) => {
    const nextId = String(id || "").trim();
    if (!nextId) return;

    setSelectedId(nextId);
    setRouteState({ hash: "detail", itemId: nextId });
    window.scrollTo(0, 0);
  }, [setRouteState]);

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
        if (currentView === "detail") {
          const createdId = String(newItem._id || newItem.id || "").trim();
          setSelectedId(createdId || null);
          setRouteState({ hash: "detail", itemId: createdId });
        } else {
          handleBackToList();
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
      setRouteState({ hash: "detail", itemId: targetId });
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
        handleBackToList();
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
        handleBackToList();
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
    setSelectedId(null);
    setRouteState({ hash: "new", itemId: null });
  };

  const handleUpdateFromItemForm = async (data: any, _selectedTagIds: string[] = []) => {
    await handleUpdateItem(data);
  };

  const handleBackToList = useCallback(() => {
    setSelectedId(null);
    setClonedItem(null);
    setRouteState({ hash: "", itemId: null });
  }, [setRouteState]);

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

  if (permissionsLoading && items.length === 0) {
    return (
      <div className="w-full p-8 text-center text-gray-500">Loading permissions...</div>
    );
  }

  if (!permissionsLoading && !resolvedCanViewItems) {
    return (
      <div className="w-full p-8">
        <div className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          You do not have permission to view Items.
        </div>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-white">
        <LoadingSpinner label="Loading items..." />
      </div>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-white px-6">
        <div className="max-w-md rounded-lg border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-sm font-semibold text-rose-700">Unable to load items</p>
          <p className="mt-2 text-sm text-rose-600">{loadError}</p>
          <button
            type="button"
            onClick={fetchItems}
            className="mt-4 rounded-md bg-[#156372] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-x-hidden">
      {currentView === "detail" && normalizedSelectedId ? (
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="hidden md:flex w-full md:w-1/5 border-r border-gray-200 bg-white flex-col z-20">
              <ItemSidebar
              items={items}
              selectedId={selectedId}
              onSelect={handleSelectItem}
              onNew={() => { if (resolvedCanCreateItems) openNewView(); }}
              baseCurrency={baseCurrency}
              onBulkMarkActive={handleBulkMarkActive}
              onBulkMarkInactive={handleBulkMarkInactive}
              onBulkDelete={async (ids: string[]) => setDeleteConfirmModal({ open: true, itemId: null, itemName: null, count: ids.length, itemIds: ids })}
              onBulkUpdate={(ids: string[]) => setBulkUpdateModal({ open: true, itemIds: ids })}
              canCreate={resolvedCanCreateItems}
              canEdit={resolvedCanEditItems}
              canDelete={resolvedCanDeleteItems}
            />
          </div>
          <div className="flex-1 bg-white overflow-auto w-full">
            {resolvedSelectedItem ? (
              <ItemDetails
                item={resolvedSelectedItem as Item}
                onBack={handleBackToList}
                onEdit={() => {
                  if (resolvedCanEditItems) {
                    setRouteState({ hash: "edit", itemId: normalizedSelectedId });
                  }
                }}
                onUpdate={handleUpdateItem}
                items={items}
                setItems={setItems}
                onDelete={handleDeleteItem}
                setSelectedId={setSelectedId}
                onClone={handleCloneItem}
                baseCurrency={baseCurrency}
                canCreate={resolvedCanCreateItems}
                canEdit={resolvedCanEditItems}
                canDelete={resolvedCanDeleteItems}
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
        <div
          className="w-full h-full overflow-y-auto overflow-x-hidden bg-white"
          style={{ scrollbarGutter: "stable" }}
        >
          {currentView === "list" && (
            <ItemsList
              items={items}
              onSelect={handleSelectItem}
              onNew={() => { if (resolvedCanCreateItems) openNewView(); }}
              onDelete={handleDeleteItem}
              onBulkDelete={async (ids: string[]) => setDeleteConfirmModal({ open: true, itemId: null, itemName: null, count: ids.length, itemIds: ids })}
              onBulkUpdate={(ids: string[]) => setBulkUpdateModal({ open: true, itemIds: ids })}
              onBulkMarkActive={handleBulkMarkActive}
              onBulkMarkInactive={handleBulkMarkInactive}
              onRefresh={fetchItems}
              baseCurrency={baseCurrency}
              isLoading={loading}
              canCreate={resolvedCanCreateItems}
              canEdit={resolvedCanEditItems}
              canDelete={resolvedCanDeleteItems}
            />
          )}

          {currentView === "new" && resolvedCanCreateItems && (
            <div className="min-h-full bg-gray-50">
              <NewItemForm
                onCancel={handleBackToList}
                onCreate={handleCreateItem}
                baseCurrency={baseCurrency}
                initialData={clonedItem}
              />
            </div>
          )}

          {currentView === "edit" && resolvedSelectedItem && resolvedCanEditItems && (
            <div className="min-h-full bg-gray-50">
              <NewItemForm
                onCancel={() => {
                  setRouteState({ hash: "detail", itemId: normalizedSelectedId });
                }}
                onCreate={handleUpdateFromItemForm}
                baseCurrency={baseCurrency}
                initialData={resolvedSelectedItem as Item}
                formTitle="Edit Item"
              />
            </div>
          )}

          {currentView === "edit" && !resolvedSelectedItem && normalizedSelectedId && (
            <div className="flex min-h-[320px] items-center justify-center px-6">
              {selectedItemQuery.isPending ? (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading item details...
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600">We couldn't open this item for editing.</p>
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
