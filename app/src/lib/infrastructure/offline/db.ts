const DB_NAME = 'cantine-offline';
const DB_VERSION = 1;

export const STORE_EMPLOYEES = 'employees';
export const STORE_PRODUCTS = 'products';
export const STORE_PENDING_SALES = 'pendingSales';
export const STORE_CART_DRAFT = 'cartDraft';

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function openOfflineDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_EMPLOYEES)) {
          db.createObjectStore(STORE_EMPLOYEES, { keyPath: 'cardNumber' });
        }
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.createObjectStore(STORE_PRODUCTS, { keyPath: 'barcode' });
        }
        if (!db.objectStoreNames.contains(STORE_PENDING_SALES)) {
          db.createObjectStore(STORE_PENDING_SALES, { keyPath: 'clientSaleId' });
        }
        if (!db.objectStoreNames.contains(STORE_CART_DRAFT)) {
          db.createObjectStore(STORE_CART_DRAFT, { keyPath: 'cardNumber' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbPut<T>(storeName: string, value: T): Promise<void> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable or write failed — offline caching is best-effort, never block the UI
  }
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // best-effort
  }
}
