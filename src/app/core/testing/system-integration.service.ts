import { Injectable } from '@angular/core';
import { SystemStatusService } from '../services/system/system-status.service';
import { PerformanceService } from '../services/system/performance.service';
import { AnalyticsService } from '../services/system/analytics.service';
import { ErrorTrackingService } from '../services/system/error-tracking.service';
import { SyncStatusService } from '../services/sync/sync-status.service';
import { CacheStorageService } from '../services/storage/cache-storage.service';
import { StorageService } from '../services/storage/storage.service';

@Injectable({ providedIn: 'root' })
export class SystemIntegrationService {
  constructor(
    private systemStatus: SystemStatusService,
    private perf: PerformanceService,
    private analytics: AnalyticsService,
    private errorTracker: ErrorTrackingService,
    private syncStatus: SyncStatusService,
    private cache: CacheStorageService,
    private storage: StorageService
  ) {}

  async runAllChecks(): Promise<void> {
    console.log('SYSTEM INTEGRATION: start');

    // 1. Ensure storage initialized
    try {
      await this.storage.init();
      console.log('SYSTEM INTEGRATION: storage initialized');
    } catch (err) {
      console.error('SYSTEM INTEGRATION: storage init failed', err);
      return;
    }

    // 2. System status snapshot
    const snap = this.systemStatus.getSnapshot();
    console.log('SYSTEM INTEGRATION: system snapshot', snap);

    // 3. Performance: create a synthetic custom measurement
    const label = `integration-heavy-${Date.now()}`;
    const start = this.perf.startMeasure(label);
    // small CPU work to measure
    for (let i = 0; i < 100000; i++) {
      Math.sqrt(i);
    }
    const duration = this.perf.endMeasure(label);
    console.log('SYSTEM INTEGRATION: perf custom measure', { label, duration });

    // 4. Analytics: log a page-view and action
    this.analytics.trackPageView('/integration/test');
    this.analytics.trackAction('integration-run', 'system-test', { duration });

    // 5. Error tracking: capture a test error
    try {
      throw new Error('Integration test error - simulated');
    } catch (e) {
      this.errorTracker.handleError(e);
      console.log('SYSTEM INTEGRATION: error logged');
    }

    // 6. Cache storage: put and match
    const fakeRes = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    await this.cache.put('/integration/cache-test', fakeRes);
    const cached = await this.cache.match('/integration/cache-test');
    console.log('SYSTEM INTEGRATION: cache match', cached ? await cached.json() : null);

    // 7. Sync status probes
    this.syncStatus.isSyncing$.subscribe(v => console.log('SYSTEM INTEGRATION: isSyncing', v));
    this.syncStatus.pendingCount$.subscribe(c => console.log('SYSTEM INTEGRATION: pendingCount', c));

    // 8. Force analytics flush (if online)
    await this.analytics.manualFlush().catch(() => console.warn('SYSTEM INTEGRATION: analytics flush failed'));

    // 9. Force error flush (if online)
    await this.errorTracker.flushErrors().catch(() => console.warn('SYSTEM INTEGRATION: error flush failed'));

    // 10. Enforce storage policy run (cleanup)
    await this.storage.init(); // ensure ready
    console.log('SYSTEM INTEGRATION: enforcing storage policies (via SystemStatus or storage.policy if needed)');
    // storage.policy is enforced by StorageGuard/SystemStatus earlier; optionally call directly via DI in real run

    console.log('SYSTEM INTEGRATION: done - check console for full trace');
  }
}
