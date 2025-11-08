import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

export interface DbStoreConfig {
  name: string;
  keyPath: string;
}

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private dbName = 'fieldflow-db';
  private dbVersion = 1;
  private db!: IDBDatabase;

  /** Initialize or upgrade database */
  init(stores: DbStoreConfig[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store.name)) {
            db.createObjectStore(store.name, { keyPath: store.keyPath });
            console.log(`[IndexedDbService] Created store: ${store.name}`);
          }
        });
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDbService] DB initialized:', this.db.name);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /** ---------- CRUD Operations ---------- **/

  add<T>(storeName: string, item: T): Observable<IDBValidKey> {
    return from(
      this.transaction<IDBValidKey>(storeName, 'readwrite', (store) => store.add(item))
    );
  }

  update<T>(storeName: string, item: T): Observable<IDBValidKey> {
    return from(
      this.transaction<IDBValidKey>(storeName, 'readwrite', (store) => store.put(item))
    );
  }

  get<T>(storeName: string, key: IDBValidKey): Observable<T | undefined> {
    return from(
      this.transaction<T | undefined>(storeName, 'readonly', (store) => store.get(key))
    );
  }

  getAll<T>(storeName: string): Observable<T[]> {
    return from(
      this.transaction<T[]>(storeName, 'readonly', (store) => store.getAll())
    );
  }

  /** ✅ Fix: use <undefined> here, not <void> */
  delete(storeName: string, key: IDBValidKey): Observable<undefined> {
    return from(
      this.transaction<undefined>(storeName, 'readwrite', (store) => store.delete(key))
    );
  }

  /** ✅ Fix: use <undefined> here too */
  clear(storeName: string): Observable<undefined> {
    return from(
      this.transaction<undefined>(storeName, 'readwrite', (store) => store.clear())
    );
  }

  /** ---------- Internal Helper ---------- **/

  private transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => console.log(`[IndexedDbService] Tx complete: ${storeName}`);
      tx.onerror = () => console.error(`[IndexedDbService] Tx failed: ${storeName}`);
    });
  }
}
