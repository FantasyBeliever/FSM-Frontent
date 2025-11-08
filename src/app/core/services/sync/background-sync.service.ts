import { Injectable, OnDestroy } from '@angular/core';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class BackgroundSyncService implements OnDestroy {
  private readonly fallbackIntervalMs = 1000 * 60 * 10; // 10 min
  private fallbackTimer?: number;
  private onlineHandler = () => this.onOnline();

  constructor(private sync: SyncService) {
    this.init();
  }

  private init(): void {
    // Listen to connectivity events
    window.addEventListener('online', this.onlineHandler);

    // Listen for background sync messages from SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event?.data?.type === 'FIELD_FLOW_SYNC') {
          void this.sync.syncAll();
        }
      });
    }

    // Start fallback interval sync
    this.startFallbackTimer();
  }

  /** Request one-shot background sync */
  async requestOneShotSync(): Promise<void> {
    void this.sync.syncAll(); // local attempt immediately
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      // Some browsers support reg.sync.register()
      const anyReg = reg as any;
      if (anyReg.sync && typeof anyReg.sync.register === 'function') {
        await anyReg.sync.register('fieldflow-sync');
        console.log('[BackgroundSyncService] One-shot background sync registered');
      }
    } catch (err) {
      console.warn('[BackgroundSyncService] Background sync registration failed', err);
    }
  }

  /** Optional: register periodic background sync */
  async registerPeriodicSync(minIntervalMs = 1000 * 60 * 60 * 6): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-ignore: periodicSync is experimental
      if ('periodicSync' in reg) {
        // @ts-ignore
        await reg.periodicSync.register('fieldflow-periodic', { minInterval: minIntervalMs });
        console.log('[BackgroundSyncService] Periodic background sync registered');
        this.stopFallbackTimer(); // no need for fallback
      }
    } catch (err) {
      console.warn('[BackgroundSyncService] Periodic sync unavailable, using fallback', err);
      this.startFallbackTimer();
    }
  }

  private startFallbackTimer(): void {
    this.stopFallbackTimer();
    this.fallbackTimer = window.setInterval(() => {
      if (navigator.onLine) {
        void this.sync.syncAll().catch(() => {});
      }
    }, this.fallbackIntervalMs);
  }

  private stopFallbackTimer(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = undefined;
    }
  }

  private onOnline(): void {
    void this.sync.syncAll();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    this.stopFallbackTimer();
  }
}
