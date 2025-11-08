import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../api/api.service';
import { IndexedDbService } from '../storage/indexed-db.service';
import { SyncStatusService } from '../sync/sync-status.service';

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  label?: string;
  value?: any;
  timestamp: number;
  sent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly store = 'analytics-events';
  private readonly batchSize = 50;

  constructor(
    private api: ApiService,
    private db: IndexedDbService,
    private syncStatus: SyncStatusService
  ) {
    // Automatically flush events when network comes online
    this.syncStatus.online$.subscribe(isOnline => {
      if (isOnline) {
        this.flushEvents().catch(err => console.warn('[AnalyticsService] flush failed', err));
      }
    });
  }

  /** Record an event (buffered if offline) */
  logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Observable<string> {
    const entry: AnalyticsEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      sent: false
    };

    return from(this.db.add(this.store, entry)).pipe(
      map(() => {
        console.log('[AnalyticsService] Logged event:', entry);
        return entry.id;
      }),
      catchError(err => {
        console.warn('[AnalyticsService] Failed to log event', err);
        return of('');
      })
    );
  }

  /** Send a batch of events to backend */
  private async sendBatch(events: AnalyticsEvent[]): Promise<boolean> {
    try {
      await this.api.post('/analytics/events', events).toPromise();
      console.log(`[AnalyticsService] Sent ${events.length} events`);
      for (const e of events) {
        await this.db.delete(this.store, e.id).toPromise();
      }
      return true;
    } catch (err) {
      console.warn('[AnalyticsService] sendBatch failed', err);
      return false;
    }
  }

  /** Flush all buffered events */
  async flushEvents(): Promise<void> {
    const all = await this.db.getAll<AnalyticsEvent>(this.store).toPromise();
    if (!all || all.length === 0) return;

    const chunks = this.chunkArray(all, this.batchSize);
    for (const batch of chunks) {
      await this.sendBatch(batch);
    }
  }

  /** Utility: chunk array for batching */
  private chunkArray<T>(arr: T[], size: number): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  }

  /** Convenience wrappers for common event types */

  trackPageView(url: string): void {
    this.logEvent({ type: 'page-view', category: 'navigation', label: url }).subscribe();
  }

  trackAction(action: string, category: string, value?: any): void {
    this.logEvent({ type: 'action', category, label: action, value }).subscribe();
  }

  trackError(error: string, category = 'runtime'): void {
    this.logEvent({ type: 'error', category, label: error }).subscribe();
  }

  trackPerformance(metric: { name: string; duration: number }): void {
    this.logEvent({
      type: 'performance',
      category: 'system',
      label: metric.name,
      value: metric.duration
    }).subscribe();
  }

  /** Manual flush trigger */
  async manualFlush(): Promise<void> {
    await this.flushEvents();
  }
}
