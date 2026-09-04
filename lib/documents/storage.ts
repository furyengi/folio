import type { FolioDocument } from './model';
const DB = 'folio-documents-v1';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export type WorkspaceSnapshot = {
  documents: FolioDocument[];
  activeId: string;
};
export async function loadWorkspace(): Promise<WorkspaceSnapshot | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readonly');
    const request = transaction.objectStore('workspace').get('current');
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}
async function writeWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readwrite');
    transaction.objectStore('workspace').put(snapshot, 'current');
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

let saveQueue: Promise<void> = Promise.resolve();
export function saveWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  const task = saveQueue
    .catch(() => undefined)
    .then(() => writeWorkspace(snapshot));
  saveQueue = task;
  return task;
}
