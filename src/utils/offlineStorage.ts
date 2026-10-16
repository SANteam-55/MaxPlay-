// High-performance, robust IndexedDB vault for persistent offline video storage
const DB_NAME = 'maxplay_offline_vault_v1';
const DB_VERSION = 1;
const STORE_NAME = 'video_blobs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

export interface StoredBlobRecord {
  key: string;
  blob: Blob;
  size: number;
  mimeType: string;
  updatedAt: number;
}

export async function saveVideoBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredBlobRecord = {
      key,
      blob,
      size: blob.size,
      mimeType: blob.type || 'video/mp4',
      updatedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    tx.onerror = () => reject(tx.error || new Error('Transaction error'));
  });
}

export async function getVideoBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result as StoredBlobRecord | undefined;
        if (result && result.blob && result.blob.size > 0) {
          resolve(result.blob);
          return;
        }

        // Fallback: search all records for matching key
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const records = (allReq.result as StoredBlobRecord[]) || [];
          const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = records.find((r) => {
            if (!r || !r.key || !r.blob) return false;
            if (r.key === key) return true;
            const rClean = r.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return rClean.includes(cleanKey) || cleanKey.includes(rClean);
          });
          resolve(match && match.blob ? match.blob : null);
        };
        allReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
    return null;
  }
}

export async function findStoredBlob(candidateKeys: string[]): Promise<Blob | null> {
  for (const k of candidateKeys) {
    if (!k) continue;
    const blob = await getVideoBlob(k);
    if (blob) return blob;
  }
  return null;
}

export async function deleteVideoBlob(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredBlobKeys(): Promise<string[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();

    req.onsuccess = () => {
      resolve((req.result as string[]) || []);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredStorageUsage(): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result as StoredBlobRecord[]) || [];
        const total = records.reduce((acc, curr) => acc + (curr.size || 0), 0);
        resolve(total);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}
