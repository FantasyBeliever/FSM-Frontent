import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';
import { StorageService } from './storage.service';

export interface OfflineAction {
  id: string;              // unique queue id
  url: string;             // API endpoint
  method: 'POST' | 'PUT' | 'DELETE';
  body?: any;              // payload
  timestamp: number;       // queued time
  retryCount?: number;     // retry attempts
  synced?: boolean;        // marked after successful replay
}

@Injectable({ providedIn: 'root' })
export class QueueStorageService {
  private readonly storeName = 'sync-queue';

  constructor(
    private indexedDb: IndexedDbService,
    private storage: StorageService
  ) {}

  /** Initialize queue store (via StorageService.init() normally) */
  async init(): Promise<void> {
    await this.storage.init();
  }

  /** ---------- Core Operations ---------- **/

  enqueue(action: OfflineAction): Observable<IDBValidKey> {
    const item = { ...action, id: action.id || crypto.randomUUID() };
    console.log('[QueueStorageService] Enqueued:', item);
    return this.indexedDb.add(this.storeName, item);
  }

  getAll(): Observable<OfflineAction[]> {
    return this.indexedDb.getAll<OfflineAction>(this.storeName);
  }

  delete(id: string): Observable<void> {
    return this.indexedDb.delete(this.storeName, id);
  }

  clear(): Observable<void> {
    return this.indexedDb.clear(this.storeName);
  }

  /** ---------- Utility Methods ---------- **/

  markAsSynced(id: string): Observable<void> {
    return this.getAll().pipe(
      map(actions => {
        const found = actions.find(a => a.id === id);
        if (found) {
          found.synced = true;
          this.indexedDb.update(this.storeName, found).subscribe();
        }
      })
    );
  }

  async getPendingCount(): Promise<number> {
    const all = await this.indexedDb.getAll<OfflineAction>(this.storeName).toPromise();
    return (all || []).filter(a => !a.synced).length;
  }

  /** Optional helper: process queue immediately (manual trigger) */
  async processQueue(
    processor: (action: OfflineAction) => Promise<boolean>
  ): Promise<void> {
    const actions = await this.indexedDb.getAll<OfflineAction>(this.storeName).toPromise();
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      try {
        const success = await processor(action);
        if (success) {
          await this.indexedDb.delete(this.storeName, action.id).toPromise();
          console.log(`[QueueStorageService] Synced: ${action.url}`);
        }
      } catch (err) {
        console.warn(`[QueueStorageService] Retry later: ${action.url}`, err);
      }
    }
  }
}
