const DB_NAME = 'codex-studio-db';
const DB_VERSION = 1;
const STORE_KV = 'kv_store';

class StorageServiceImpl {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback = new Map<string, string>();

  private openDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = window.indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_KV)) {
              db.createObjectStore(STORE_KV);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await this.openDB();
      if (db) {
        const val = await new Promise<string | undefined>((resolve) => {
          const tx = db.transaction(STORE_KV, 'readonly');
          const store = tx.objectStore(STORE_KV);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result as string | undefined);
          req.onerror = () => resolve(undefined);
        });
        if (typeof val === 'string') {
          return JSON.parse(val) as T;
        }
      }
    } catch {
      // Fallback below
    }

    try {
      const ls = window.localStorage.getItem(`codex_${key}`);
      if (ls !== null) {
        return JSON.parse(ls) as T;
      }
    } catch {
      // Fallback to memory
    }

    const mem = this.memoryFallback.get(key);
    return mem !== undefined ? (JSON.parse(mem) as T) : defaultValue;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    this.memoryFallback.set(key, serialized);

    try {
      window.localStorage.setItem(`codex_${key}`, serialized);
    } catch {
      // Ignore quota errors on localStorage; IndexedDB handles larger payloads
    }

    try {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_KV, 'readwrite');
          const store = tx.objectStore(STORE_KV);
          store.put(serialized, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch {
      // Already stored in memory/localStorage
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryFallback.delete(key);
    try {
      window.localStorage.removeItem(`codex_${key}`);
    } catch {
      // ignore
    }
    try {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_KV, 'readwrite');
          tx.objectStore(STORE_KV).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch {
      // ignore
    }
  }

  async clearAll(): Promise<void> {
    this.memoryFallback.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith('codex_')) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    try {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_KV, 'readwrite');
          tx.objectStore(STORE_KV).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch {
      // ignore
    }
  }

  async estimateStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number }> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        return {
          usedBytes: est.usage || 0,
          quotaBytes: est.quota || 50 * 1024 * 1024,
        };
      }
    } catch {
      // ignore
    }
    let approx = 0;
    this.memoryFallback.forEach((v) => {
      approx += v.length * 2;
    });
    return { usedBytes: approx, quotaBytes: 50 * 1024 * 1024 };
  }
}

export const StorageService = new StorageServiceImpl();
