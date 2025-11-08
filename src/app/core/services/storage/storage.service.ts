import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { IndexedDbService } from './indexed-db.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private indexedDb: IndexedDbService) {}

  /** Initialize DB with common stores */
  async init(): Promise<void> {
    await this.indexedDb.init([
      { name: 'jobs', keyPath: 'id' },
      { name: 'technicians', keyPath: 'id' },
      { name: 'customers', keyPath: 'id' },
      { name: 'payments', keyPath: 'id' },
      { name: 'sync-queue', keyPath: 'id' },
    ]);
  }

  /** ---------- IndexedDB CRUD Wrappers ---------- **/

  add<T>(store: string, data: T): Observable<IDBValidKey> {
    return this.indexedDb.add(store, data);
  }

  update<T>(store: string, data: T): Observable<IDBValidKey> {
    return this.indexedDb.update(store, data);
  }

  get<T>(store: string, id: IDBValidKey): Observable<T | undefined> {
    return this.indexedDb.get(store, id);
  }

  getAll<T>(store: string): Observable<T[]> {
    return this.indexedDb.getAll(store);
  }

  delete(store: string, id: IDBValidKey): Observable<void> {
    return this.indexedDb.delete(store, id);
  }

  clear(store: string): Observable<void> {
    return this.indexedDb.clear(store);
  }

  /** ---------- LocalStorage Helpers ---------- **/

  setLocal(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('[StorageService] LocalStorage set failed', err);
    }
  }

  getLocal<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error('[StorageService] LocalStorage parse error', err);
      return null;
    }
  }

  removeLocal(key: string): void {
    localStorage.removeItem(key);
  }

  /** ---------- Cache Storage Helpers (for responses & static assets) ---------- **/

  async putInCache(cacheName: string, request: Request, response: Response): Promise<void> {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }

  async getFromCache(cacheName: string, request: Request): Promise<Response | undefined> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    return cachedResponse || undefined;
  }

  async clearCache(cacheName: string): Promise<void> {
    await caches.delete(cacheName);
  }

  /** ---------- Utility ---------- **/

  async clearAll(): Promise<void> {
    localStorage.clear();
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    console.log('[StorageService] Cleared all LocalStorage + CacheStorage');
  }
}
