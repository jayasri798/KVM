/**
 * Native, dependency-free IndexedDB secure vault storage wrapper.
 * Storing cryptographic private keys in IndexedDB avoids exposing them in standard localStorage.
 */

const DB_NAME = "kam_secure_vault";
const STORE_NAME = "keys";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Retrieves a private key JWK for the given user ID.
 */
export async function getPrivateKey(uid: string): Promise<JsonWebKey | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(uid);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to get item from IndexedDB"));
      };
    });
  } catch (err) {
    console.error("IndexedDB getPrivateKey error:", err);
    return null;
  }
}

/**
 * Saves a private key JWK for the given user ID.
 */
export async function savePrivateKey(uid: string, key: JsonWebKey): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(key, uid);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to save item in IndexedDB"));
    };
  });
}

/**
 * Deletes the private key JWK for the given user ID.
 */
export async function deletePrivateKey(uid: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(uid);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to delete item from IndexedDB"));
    };
  });
}
