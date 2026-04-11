export type FileManifestRecord = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  hash: string;
  version_id: string;
  last_updated: string;
  localPath?: string;
  remoteUrl?: string;
  downloaded?: boolean;
  pending_sync?: boolean;
};

export type FileManifestDiff = {
  toDownload: FileManifestRecord[];
  toKeep: FileManifestRecord[];
  toRemove: FileManifestRecord[];
};

const DB_NAME = "billing_sync_engine_db";
const DB_VERSION = 1;
const STORE_NAME = "file_manifest";

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = <T,>(mode: IDBTransactionMode, executor: (store: IDBObjectStore) => IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = executor(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      })
      .catch(reject);
  });

export const diffFileManifest = (
  localRows: FileManifestRecord[],
  remoteRows: FileManifestRecord[]
): FileManifestDiff => {
  const localById = new Map(localRows.map((row) => [row.id, row]));
  const toDownload: FileManifestRecord[] = [];
  const toKeep: FileManifestRecord[] = [];
  const toRemove: FileManifestRecord[] = [];

  for (const remoteRow of remoteRows) {
    const localRow = localById.get(remoteRow.id);
    if (!localRow || !localRow.hash || localRow.hash !== remoteRow.hash) {
      toDownload.push(remoteRow);
    } else {
      toKeep.push(remoteRow);
    }
  }

  for (const localRow of localRows) {
    if (!remoteRows.some((row) => row.id === localRow.id)) {
      toRemove.push(localRow);
    }
  }

  return { toDownload, toKeep, toRemove };
};

export class FileManifestStore {
  async getAll() {
    return runTransaction("readonly", (store) => store.getAll());
  }

  async putManyAtomic(rows: FileManifestRecord[]) {
    await new Promise<void>((resolve, reject) => {
      openDatabase()
        .then((db) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          for (const row of rows) {
            store.put(row);
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        })
        .catch(reject);
    });
  }

  async removeMany(ids: string[]) {
    await new Promise<void>((resolve, reject) => {
      openDatabase()
        .then((db) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          for (const id of ids) {
            store.delete(id);
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        })
        .catch(reject);
    });
  }
}
