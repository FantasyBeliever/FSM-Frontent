import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { lastValueFrom } from 'rxjs';
import { SystemStatus } from '../../../core/services/system/system-status.service';
import { PerformanceMetric } from '../../../core/services/system/performance.service';
import { SystemStatusService } from '../../../core/services/system/system-status.service';
import { AnalyticsEvent } from '../../../core/services/system/analytics.service';
import { PerformanceService } from '../../../core/services/system/performance.service';
import { ErrorTrackingService } from '../../../core/services/system/error-tracking.service';
import { AnalyticsService } from '../../../core/services/system/analytics.service';
import { SyncStatusService } from '../../../core/services/sync/sync-status.service';
import { IndexedDbService } from '../../../core/services/storage/indexed-db.service';

@Component({
  selector: 'app-system-health',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-health.component.html',
  styleUrls: ['./system-health.component.scss']
})
export class SystemHealthComponent implements OnInit {
  status: SystemStatus | null = null;
  recentMetrics: PerformanceMetric[] = [];
  recentErrors: any[] = [];
  pendingAnalyticsCount = 0;
  pendingErrorsCount = 0;
  pendingTransactionsCount = 0;
  syncing = false;

  // controls
  loading = false;
  lastRefreshed: number | null = null;

  constructor(
    private systemStatus: SystemStatusService,
    private perf: PerformanceService,
    private errorTracker: ErrorTrackingService,
    private analytics: AnalyticsService,
    private syncStatus: SyncStatusService,
    private db: IndexedDbService
  ) {}

  async ngOnInit(): Promise<void> {
    this.systemStatus.status$.subscribe(s => (this.status = s));
    this.syncStatus.isSyncing$.subscribe(v => (this.syncing = v));
    // get recent metrics snapshot
    this.recentMetrics = this.perf.getRecentMetrics(20);
    // reactive update when metric emits
    this.perf.metrics$.subscribe(m => {
      if (m) {
        this.recentMetrics = [m, ...this.recentMetrics].slice(0, 50);
      }
    });

    await this.refreshCounts();
    this.lastRefreshed = Date.now();
  }

  /** Refresh counts and local lists from IndexedDB */
  async refreshCounts(): Promise<void> {
    this.loading = true;
    try {
      // analytics-events store (from AnalyticsService)
      try {
        const analyticsAll = await lastValueFrom(this.db.getAll<AnalyticsEvent>('analytics-events'));
        this.pendingAnalyticsCount = (analyticsAll || []).length;
      } catch {
        this.pendingAnalyticsCount = 0;
      }

      // error-logs store (from ErrorTrackingService)
      try {
        const errors = await lastValueFrom(this.db.getAll<any>('error-logs'));
        this.recentErrors = (errors || []).slice(-50).reverse();
        this.pendingErrorsCount = (errors || []).length;
      } catch {
        this.recentErrors = [];
        this.pendingErrorsCount = 0;
      }

      // subscription/credit-transactions store
      try {
        const tx = await lastValueFrom(this.db.getAll<any>('credit-transactions'));
        this.pendingTransactionsCount = (tx || []).length;
      } catch {
        this.pendingTransactionsCount = 0;
      }

      // update metrics fallback
      this.recentMetrics = this.perf.getRecentMetrics(50);
    } finally {
      this.loading = false;
      this.lastRefreshed = Date.now();
    }
  }

  /** Trigger a manual API health refresh and sync-status check */
  async runSelfChecks(): Promise<void> {
    this.loading = true;
    try {
      await this.systemStatus.refreshApiStatus();
      await this.refreshCounts();
    } finally {
      this.loading = false;
      this.lastRefreshed = Date.now();
    }
  }

  /** Export a JSON diagnostic report containing current status + DB snapshots */
  async exportDiagnostics(): Promise<void> {
    this.loading = true;
    try {
      const analyticsAll = await lastValueFrom(this.db.getAll<any>('analytics-events')).catch(() => []);
      const errorAll = await lastValueFrom(this.db.getAll<any>('error-logs')).catch(() => []);
      const txAll = await lastValueFrom(this.db.getAll<any>('credit-transactions')).catch(() => []);
      const report = {
        ts: new Date().toISOString(),
        systemStatus: this.systemStatus.getSnapshot(),
        metrics: this.recentMetrics,
        analyticsCount: analyticsAll.length,
        errorCount: errorAll.length,
        transactionsCount: txAll.length,
        analyticsSample: analyticsAll.slice(-50),
        errorSample: errorAll.slice(-50),
        transactionsSample: txAll.slice(-50)
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fieldflow-diagnostics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('[SystemHealth] Diagnostics exported');
    } finally {
      this.loading = false;
    }
  }

  // utility for readable date
  format(ts?: number | null): string {
    if (!ts) return '-';
    return new Date(ts).toLocaleString();
  }
}
