import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, interval, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { StorageService } from '../storage/storage.service';
import { SyncStatusService } from '../sync/sync-status.service';
import { ApiService } from '../api/api.service';

export interface SystemStatus {
  network: 'online' | 'offline';
  api: 'healthy' | 'unreachable';
  storage: 'ready' | 'uninitialized';
  sync: 'idle' | 'running';
  lastChecked: number;
}

@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private readonly pingEndpoint = '/health';
  private readonly pingIntervalMs = 30000; // 30s

  private statusSubject = new BehaviorSubject<SystemStatus>({
    network: navigator.onLine ? 'online' : 'offline',
    api: 'unreachable',
    storage: 'uninitialized',
    sync: 'idle',
    lastChecked: Date.now()
  });
  status$ = this.statusSubject.asObservable().pipe(distinctUntilChanged());

  constructor(
    private api: ApiService,
    private storage: StorageService,
    private syncStatus: SyncStatusService
  ) {
    this.monitorNetwork();
    this.monitorApiHealth();
    this.monitorStorage();
    this.monitorSync();
  }

  // ---------- Network Monitoring ----------
  private monitorNetwork(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => 'online' as const));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => 'offline' as const));

    online$
      .pipe(startWith(navigator.onLine ? ('online' as const) : ('offline' as const)))
      .subscribe(state => {
        this.updateStatus({ network: state });
      });

    offline$.subscribe(state => {
      this.updateStatus({ network: state });
    });
  }

  // ---------- API Health ----------
  private monitorApiHealth(): void {
    interval(this.pingIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.api.get<{ status: string }>(this.pingEndpoint).pipe(
            map(() => 'healthy' as const),
            catchError(() => of('unreachable' as const))
          )
        )
      )
      .subscribe(apiStatus => {
        this.updateStatus({ api: apiStatus });
      });
  }

  // ---------- Storage Initialization ----------
  private monitorStorage(): void {
    // Attempt to init storage once on startup
    this.storage.init().then(
      () => this.updateStatus({ storage: 'ready' }),
      () => this.updateStatus({ storage: 'uninitialized' })
    );
  }

  // ---------- Sync Monitoring ----------
  private monitorSync(): void {
    combineLatest([
      this.syncStatus.isSyncing$,
      this.syncStatus.pendingCount$
    ]).subscribe(([isSyncing, pending]) => {
      const syncState = isSyncing ? 'running' : 'idle';
      this.updateStatus({ sync: syncState });
      // optional log: console.log(`[SystemStatus] Sync: ${syncState}, Pending: ${pending}`);
    });
  }

  // ---------- Update Helper ----------
  private updateStatus(patch: Partial<SystemStatus>): void {
    const current = this.statusSubject.value;
    const updated: SystemStatus = { ...current, ...patch, lastChecked: Date.now() };
    this.statusSubject.next(updated);
  }

  // ---------- Public API ----------
  getSnapshot(): SystemStatus {
    return this.statusSubject.value;
  }

  isSystemHealthy(): boolean {
    const s = this.statusSubject.value;
    return (
      s.network === 'online' &&
      s.api === 'healthy' &&
      s.storage === 'ready'
    );
  }

  async refreshApiStatus(): Promise<void> {
    try {
      await this.api.get<{ status: string }>(this.pingEndpoint).toPromise();
      this.updateStatus({ api: 'healthy' });
    } catch {
      this.updateStatus({ api: 'unreachable' });
    }
  }
}
