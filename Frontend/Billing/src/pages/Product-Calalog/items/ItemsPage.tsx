// src/features/items/ItemsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
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

function ItemsPageContent() {
  const location = useLocation();
  const navigate = useNavigate();

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

  const normalizeItemForList = (item: Item) => ({
    ...item,
    images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
    id: item.id || item._id,
    active: item.active !== undefined ? item.active : item.isActive
  });

  // Load items from API
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemsAPI.getAll();
      const itemsData = response.data || [];
      const normalizedItems = itemsData.map((item: Item) => normalizeItemForList(item));
      setItems(normalizedItems);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewItems) {
      setLoading(false);
      return;
    }
    fetchItems();
  }, [permissionsLoading, canViewItems]);

  const selectedItem = useMemo(
    () => items.find((x: Item) => x.id === selectedId || x._id === selectedId) || null,
    [items, selectedId]
  );

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
      const normalizedItem = normalizeItemForList(newItem as Item);
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
      // Final sync from local store/API
      fetchItems();
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
      const response = await itemsAPI.update(targetId, {
        ...safeSelected,
        ...safeData,
      });
      if (response && response.success === false) {
        throw new Error(response.message || "Failed to update item");
      }
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
      await itemsAPI.delete(deleteConfirmModal.itemId);
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
      await Promise.all(deleteConfirmModal.itemIds.map(id => itemsAPI.delete(id)));
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
    setSelectedId(null);
    setClonedItem(null);
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
      {view === "detail" && selectedItem ? (
        <div className="flex flex-col md:flex-row gap-0 h-full">
          <div className="hidden md:flex w-full md:w-1/5 border-r border-gray-200 bg-white flex-col z-20">
            <ItemSidebar
              items={items}
              selectedId={selectedId}
              onSelect={(id: string) => { setSelectedId(id); setView("detail"); window.scrollTo(0, 0); }}
              onNew={() => { if (canCreateItems) { setView("new"); setSelectedId(null); } }}
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
              item={selectedItem as Item}
              onBack={handleBackToList}
              onEdit={() => { if (canEditItems) setView("edit"); }}
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
          </div>
        </div>
      ) : (
        <div className={`w-full h-full ${view === "list" ? "overflow-hidden" : "overflow-visible"}`}>
          {view === "list" && (
            <ItemsList
              items={items}
              onSelect={(id: string) => { setSelectedId(id); setView("detail"); window.scrollTo(0, 0); }}
              onNew={() => { if (canCreateItems) { setView("new"); setSelectedId(null); } }}
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
            <EditItemForm
              onCancel={() => setView("detail")}
              onUpdate={handleUpdateItem}
              baseCurrency={baseCurrency}
              item={selectedItem as Item}
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
