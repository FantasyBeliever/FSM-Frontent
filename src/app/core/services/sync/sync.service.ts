// src/app/core/services/sync/sync.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Subject, from, timer, lastValueFrom } from 'rxjs';
import { concatMap, delayWhen } from 'rxjs/operators';
import { QueueStorageService, OfflineAction } from '../storage/queue-storage.service';
import { StoragePolicy } from '../storage/storage.policy';
import { ApiService } from '../api/api.service';
import { StorageService } from '../storage/storage.service';
import { ConflictResolutionService } from './conflict-resolution.service';

export type SyncEvent =
  | { type: 'start' }
  | { type: 'progress'; processed: number; total: number }
  | { type: 'success'; id: string }
  | { type: 'failed'; id: string; error: any }
  | { type: 'complete'; succeeded: number; failed: number };

@Injectable({ providedIn: 'root' })
export class SyncService implements OnDestroy {
  private onlineListener = () => this.onOnline();
  private stopProcessing = false;

  private events = new Subject<SyncEvent>();
  events$ = this.events.asObservable();

  // configuration
  private maxRetries = 3;
  private baseBackoffMs = 800; // exponential backoff base

  constructor(
    private queue: QueueStorageService,
    private api: ApiService,
    private storage: StorageService,
    private policy: StoragePolicy,
    private conflict: ConflictResolutionService
  ) {
    // auto-initialize when created (does not auto-run sync)
    window.addEventListener('online', this.onlineListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineListener);
    this.events.complete();
    this.stopProcessing = true;
  }

  // Public: manually trigger full sync
  async syncAll(): Promise<void> {
    if (!navigator.onLine) return;

    this.stopProcessing = false;
    this.events.next({ type: 'start' });

    // ensure stores are ready & policy applied
    await this.storage.init();
    await this.policy.enforcePolicies();

    // fetch queue items
    const queued = await lastValueFrom(this.queue.getAll());
    if (!queued || queued.length === 0) {
      this.events.next({ type: 'complete', succeeded: 0, failed: 0 });
      return;
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const total = queued.length;

    // process sequentially (safer for ordering)
    for (const action of queued) {
      if (this.stopProcessing) break;
      this.events.next({ type: 'progress', processed, total });

      try {
        const ok = await this.processActionWithRetries(action);
        processed++;
        if (ok) {
          succeeded++;
          // remove from queue
          await lastValueFrom(this.queue.delete(action.id));
          this.events.next({ type: 'success', id: action.id });
        } else {
          failed++;
          this.events.next({ type: 'failed', id: action.id, error: 'max-retries-exceeded' });
        }
      } catch (err) {
        processed++;
        failed++;
        this.events.next({ type: 'failed', id: action.id, error: err });
      }
    }

    // after replays, enforce storage policy again
    await this.policy.enforcePolicies();

    this.events.next({ type: 'complete', succeeded, failed });
  }

  // Called when app comes online
  private onOnline(): void {
    // Fire-and-forget sync (awaiting is optional)
    this.syncAll().catch((err) => console.warn('[SyncService] syncAll failed', err));
  }

  // Stop any current processing (useful before app shutdown or navigation)
  stop(): void {
    this.stopProcessing = true;
  }

  // Helper: attempt to process an action with retries & backoff
  private async processActionWithRetries(action: OfflineAction): Promise<boolean> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const ok = await this.dispatchAction(action);
        if (ok) return true;
      } catch (err) {
        // on conflict (409) we call conflict handler and decide
        if (this.isConflictError(err)) {
          const resolved = await this.handleConflict(action, err);
          if (resolved) return true;
          // if conflict handler says not resolved, treat as failure and stop retrying
          return false;
        }
        // otherwise continue to retry
      }

      attempt++;
      const wait = this.baseBackoffMs * Math.pow(2, attempt - 1);
      await this.delay(wait);
    }
    return false;
  }

  // Actual dispatcher: uses ApiService to perform network call
  private async dispatchAction(action: OfflineAction): Promise<boolean> {
    // Construct payload call depending on method
    // ApiService assumed to have .post/.put/.delete methods that return Observable<ApiResponse>
    try {
      if (action.method === 'POST') {
        await lastValueFrom(this.api.post<any>(action.url, action.body));
        return true;
      } else if (action.method === 'PUT') {
        await lastValueFrom(this.api.put<any>(action.url, action.body));
        return true;
      } else if (action.method === 'DELETE') {
        await lastValueFrom(this.api.delete<any>(action.url));
        return true;
      } else {
        throw new Error('Unsupported method');
      }
    } catch (err) {
      // bubble up error to retry logic
      throw err;
    }
  }

  // Simple conflict detection (server returns 409 or specific response)
  private isConflictError(err: any): boolean {
    if (!err) return false;
    // If using ApiService that wraps HttpErrorResponse:
    const status = err?.status;
    return status === 409;
  }

private async handleConflict(action: OfflineAction, error: any): Promise<boolean> {
  console.warn('[SyncService] Conflict detected, delegating to ConflictResolutionService');
  const serverData = await this.fetchServerState(action);
  const localData = action.body || {};
  const ctx = {
    store: this.extractStoreName(action.url),
    localData,
    serverData,
    action,
    conflictReason: '409 Conflict'
  };

  return this.conflict.resolve(ctx);
}

// Helper to fetch server copy
private async fetchServerState(action: OfflineAction): Promise<any> {
  try {
    return await lastValueFrom(this.api.get<any>(action.url));
  } catch {
    return null;
  }
}

// Map API URL to local store name
private extractStoreName(url: string): string {
  if (url.includes('/jobs')) return 'jobs';
  if (url.includes('/technicians')) return 'technicians';
  if (url.includes('/customers')) return 'customers';
  return 'sync-queue';
}


  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}
