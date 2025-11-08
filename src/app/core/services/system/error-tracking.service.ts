import { ErrorHandler, Injectable } from '@angular/core';
import { fromEvent, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../api/api.service';
import { IndexedDbService } from '../storage/indexed-db.service';
import { SyncStatusService } from '../sync/sync-status.service';
import { AnalyticsService } from './analytics.service';

export interface TrackedError {
  id: string;
  message: string;
  source: string;
  stack?: string;
  url?: string;
  timestamp: number;
  sent?: boolean;
  context?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class ErrorTrackingService implements ErrorHandler {
  private readonly store = 'error-logs';
  private readonly uploadEndpoint = '/errors';
  private readonly maxStored = 200;

  constructor(
    private api: ApiService,
    private db: IndexedDbService,
    private syncStatus: SyncStatusService,
    private analytics: AnalyticsService
  ) {
    // Automatically flush errors when network returns
    this.syncStatus.online$.subscribe(isOnline => {
      if (isOnline) {
        this.flushErrors().catch(err => console.warn('[ErrorTrackingService] flush failed', err));
      }
    });

    // Capture global unhandledrejection
    fromEvent(window, 'unhandledrejection').subscribe((event: any) => {
      const reason = event.reason?.message || event.reason || 'Unhandled promise rejection';
      this.handleError(reason);
    });
  }

  handleError(error: any): void {
    const errorObj: TrackedError = this.normalizeError(error);
    this.logError(errorObj).catch(err => console.warn('[ErrorTrackingService] Failed to log error', err));
    this.analytics.trackError(errorObj.message, 'runtime');
  }

  // Normalize various error types
  private normalizeError(error: any): TrackedError {
    let message = '';
    let stack = '';

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
      stack = error.stack || '';
    } else if (error?.message) {
      message = error.message;
      stack = error.stack || '';
    } else {
      message = JSON.stringify(error);
    }

    return {
      id: crypto.randomUUID(),
      message,
      source: 'client',
      stack,
      url: window.location.href,
      timestamp: Date.now(),
      sent: false
    };
  }

  // Store in IndexedDB for offline persistence
  private async logError(error: TrackedError): Promise<void> {
    await this.db.add(this.store, error).toPromise();
    const all = await this.db.getAll<TrackedError>(this.store).toPromise();
    if (all && all.length > this.maxStored) {
      const oldest = all.sort((a, b) => a.timestamp - b.timestamp).slice(0, all.length - this.maxStored);
      for (const e of oldest) {
        await this.db.delete(this.store, e.id).toPromise();
      }
    }
    console.error('[ErrorTrackingService] Captured:', error.message);
  }

  // Send batched errors to backend
  private async sendBatch(errors: TrackedError[]): Promise<boolean> {
    try {
      await this.api.post(this.uploadEndpoint, errors).toPromise();
      for (const e of errors) {
        await this.db.delete(this.store, e.id).toPromise();
      }
      console.log(`[ErrorTrackingService] Uploaded ${errors.length} errors`);
      return true;
    } catch (err) {
      console.warn('[ErrorTrackingService] sendBatch failed', err);
      return false;
    }
  }

  // Flush all errors
  async flushErrors(): Promise<void> {
    const all = await this.db.getAll<TrackedError>(this.store).toPromise();
    if (!all || all.length === 0) return;
    const chunkSize = 20;
    for (let i = 0; i < all.length; i += chunkSize) {
      const chunk = all.slice(i, i + chunkSize);
      await this.sendBatch(chunk);
    }
  }
}
