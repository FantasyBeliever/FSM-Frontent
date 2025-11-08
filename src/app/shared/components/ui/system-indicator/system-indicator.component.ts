import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BehaviorSubject, Observable } from 'rxjs';
import { SystemStatusService } from '../../../../core/services/system/system-status.service';
import { SyncStatusService } from '../../../../core/services/sync/sync-status.service';
import { ErrorTrackingService } from '../../../../core/services/system/error-tracking.service';

interface SystemStatus {
  network: 'online' | 'offline' | string;
  api: 'reachable' | 'unreachable' | string;
  storage: 'ok' | 'full' | string;
  sync: 'idle' | 'running' | string;
}

@Component({
  selector: 'app-system-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-indicator.component.html',
  styleUrls: ['./system-indicator.component.scss']
})
export class SystemIndicatorComponent implements OnInit {
  status: SystemStatus | null = null;
  errorCount$ = new BehaviorSubject<number>(0);
  syncing$: Observable<boolean>;

  constructor(
    private systemStatus: SystemStatusService,
    private syncStatus: SyncStatusService,
    private errorTracker: ErrorTrackingService
  ) {
    this.syncing$ = this.syncStatus.isSyncing$;
  }

  ngOnInit(): void {
    this.systemStatus.status$.subscribe(s => (this.status = s));
    this.refreshErrorCount();
  }

  async refreshErrorCount(): Promise<void> {
    try {
      const all = await this.errorTracker['db'].getAll<any>('error-logs').toPromise();
      this.errorCount$.next(all ? all.length : 0);
    } catch {
      this.errorCount$.next(0);
    }
  }

  getStatusClass(): string {
    if (!this.status) return 'status-unknown';
    if (this.status.network === 'offline') return 'status-offline';
    if (this.status.api === 'unreachable') return 'status-warning';
    if (this.status.sync === 'running') return 'status-sync';
    return 'status-ok';
  }

  getTooltip(): string {
    if (!this.status) return 'System status unknown';
    const { network, api, storage, sync } = this.status;
    return `Network: ${network}, API: ${api}, Storage: ${storage}, Sync: ${sync}`;
  }
}
