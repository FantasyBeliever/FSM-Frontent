// src/app/core/services/sync/sync-status.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, interval, Subscription, merge, of } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { SyncService, SyncEvent } from './sync.service';
import { QueueStorageService } from '../storage/queue-storage.service';

export interface SyncProgress {
  processed: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class SyncStatusService implements OnDestroy {
  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  isSyncing$ = this.isSyncingSubject.asObservable().pipe(distinctUntilChanged());

  private progressSubject = new BehaviorSubject<SyncProgress>({ processed: 0, total: 0 });
  progress$ = this.progressSubject.asObservable();

  private lastSyncSubject = new BehaviorSubject<number | null>(null);
  lastSync$ = this.lastSyncSubject.asObservable();

  private pendingCountSubject = new BehaviorSubject<number>(0);
  pendingCount$ = this.pendingCountSubject.asObservable();

  // online status observable
  online$ = merge(
    of(navigator.onLine),
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false))
  ).pipe(startWith(navigator.onLine), distinctUntilChanged());

  private queuePollSub?: Subscription;
  private syncEventsSub?: Subscription;

  constructor(
    private sync: SyncService,
    private queue: QueueStorageService
  ) {
    // Subscribe to SyncService events
    this.syncEventsSub = this.sync.events$.subscribe((evt: SyncEvent) => this.handleSyncEvent(evt));

    // Start small poll for pending count (keeps UI reactive when queue changes)
    this.startPollingPendingCount();
  }

  // Trigger a manual sync via SyncService
  async triggerSync(): Promise<void> {
    try {
      await this.sync.syncAll();
    } catch (err) {
      // swallow - SyncService emits its own events for UI
      console.warn('[SyncStatusService] triggerSync error', err);
    }
  }

  // Start/stop polling pending queue count (default interval 5s)
  startPollingPendingCount(intervalMs = 5000): void {
    if (this.queuePollSub) this.queuePollSub.unsubscribe();
    this.queuePollSub = interval(intervalMs)
      .pipe(
        // switchMap to promise -> observable
        switchMap(() => this.queue.getAll()),
        map(items => (items || []).filter((it: any) => !it.synced).length)
      )
      .subscribe(count => this.pendingCountSubject.next(count));
  }

  stopPollingPendingCount(): void {
    if (this.queuePollSub) {
      this.queuePollSub.unsubscribe();
      this.queuePollSub = undefined;
    }
  }

  // Convert SyncService events to small UI-friendly subjects
  private handleSyncEvent(evt: SyncEvent): void {
    switch (evt.type) {
      case 'start':
        this.isSyncingSubject.next(true);
        this.progressSubject.next({ processed: 0, total: 0 });
        break;

      case 'progress':
        this.progressSubject.next({ processed: evt.processed, total: evt.total });
        break;

      case 'success':
        // optional: update pending count immediately
        this.refreshPendingCount();
        break;

      case 'failed':
        // nothing special besides logging; pending count will reflect it
        this.refreshPendingCount();
        break;

      case 'complete':
        this.isSyncingSubject.next(false);
        this.lastSyncSubject.next(Date.now());
        // update pending count one final time
        this.refreshPendingCount();
        break;
    }
  }

  // Small helper to refresh pendingCount immediately
  private async refreshPendingCount(): Promise<void> {
    try {
      const items = await this.queue.getAll().toPromise();
      const count = (items || []).filter((it: any) => !it.synced).length;
      this.pendingCountSubject.next(count);
    } catch (err) {
      console.warn('[SyncStatusService] refreshPendingCount failed', err);
    }
  }

  ngOnDestroy(): void {
    if (this.syncEventsSub) this.syncEventsSub.unsubscribe();
    this.stopPollingPendingCount();
  }
}
