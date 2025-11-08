import { Injectable } from '@angular/core';
import { OfflineAction, QueueStorageService } from '../services/storage/queue-storage.service';
import { SyncService } from '../services/sync/sync.service';
import { SyncStatusService } from '../services/sync/sync-status.service';
import { BackgroundSyncService } from '../services/sync/background-sync.service';
import { ConflictResolutionService } from '../services/sync/conflict-resolution.service';

@Injectable({ providedIn: 'root' })
export class SyncIntegrationService {
  constructor(
    private queue: QueueStorageService,
    private sync: SyncService,
    private syncStatus: SyncStatusService,
    private bgSync: BackgroundSyncService,
    private conflict: ConflictResolutionService
  ) {}

  async runFullTest(): Promise<void> {
    console.log('--- Sync Layer Integration Test Start ---');

    // Step 1: Enqueue sample offline actions
    const offlineActions = [
      {
        id: crypto.randomUUID(),
        url: '/api/jobs',
        method: 'POST' as const,
        body: { id: 1, title: 'Offline Job #1' },
        timestamp: Date.now()
      },
      {
        id: crypto.randomUUID(),
        url: '/api/jobs',
        method: 'POST' as const,
        body: { id: 2, title: 'Offline Job #2' },
        timestamp: Date.now()
      }
    ];
    offlineActions.forEach(a => this.queue.enqueue(a).subscribe());
    console.log('[SyncIntegration] Enqueued 2 offline jobs');

    // Step 2: Simulate background sync request
    await this.bgSync.requestOneShotSync();

    // Step 3: Monitor SyncStatusService observables
    this.syncStatus.isSyncing$.subscribe(v => console.log('[SyncStatus] isSyncing:', v));
    this.syncStatus.progress$.subscribe(p => console.log('[SyncStatus] progress:', p));
    this.syncStatus.pendingCount$.subscribe(c => console.log('[SyncStatus] pendingCount:', c));
    this.syncStatus.lastSync$.subscribe(ts => {
      if (ts) console.log('[SyncStatus] lastSync:', new Date(ts).toISOString());
    });

    // Step 4: Trigger SyncService manually
    await this.sync.syncAll();

    // Step 5: Force conflict resolution simulation
    const conflictAction: OfflineAction = {
      id: crypto.randomUUID(),
      url: '/api/jobs/1',
      method: 'PUT' as const,
      body: { id: 1, title: 'Edited offline while server also updated' },
      timestamp: Date.now()
    };
    console.log('[SyncIntegration] Forcing conflict simulation (server-wins)');
    await this.conflict.resolve({
      store: 'jobs',
      localData: { ...conflictAction.body, updatedAt: Date.now() },
      serverData: { id: 1, title: 'Server version of Job #1', updatedAt: Date.now() },
      action: conflictAction,
      conflictReason: 'Simulated'
    });

    // Step 6: Confirm all flows
    console.log('--- Sync Layer Integration Test Completed ---');
  }
}
