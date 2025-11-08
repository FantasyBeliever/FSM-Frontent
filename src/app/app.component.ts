import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api/api.service';
import { LoadingSpinnerComponent } from './shared/components/ui/loading-spinner/loading-spinner.component';
import { ToastMessageComponent } from './shared/components/ui/toast-message/toast-message.component';
import { CommonModule } from '@angular/common';
import { IndexedDbService } from './core/services/storage/indexed-db.service';
import { StorageIntegrationService } from './core/testing/storage-integration.service';
import { SyncService } from './core/services/sync/sync.service';
import { BackgroundSyncService } from './core/services/sync/background-sync.service';
import { SyncStatusService } from './core/services/sync/sync-status.service';
import { SyncIntegrationService } from './core/testing/sync-integration.service';
import { ErrorTrackingService } from './core/services/system/error-tracking.service';
import { SystemIndicatorComponent } from "./shared/components/ui/system-indicator/system-indicator.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // ✅ required for *ngIf, |async, etc.
    RouterOutlet,
    LoadingSpinnerComponent,
    ToastMessageComponent,
    SystemIndicatorComponent
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'fieldflow-pwa';

  constructor(
    private api: ApiService,
    private indexedDbService: IndexedDbService,
    private storageTest: StorageIntegrationService,
    private sync: SyncService,
    private bgSync: BackgroundSyncService,
    private syncStatus: SyncStatusService,
    private syncIntegration: SyncIntegrationService,
    private errorTracker: ErrorTrackingService
  ) {}

  ngOnInit() {
    this.storageTest.runFullTest();
    this.syncIntegration.runFullTest();
     this.syncStatus.isSyncing$.subscribe(isSyncing => {
    // show spinner or indicator
  });

  this.syncStatus.pendingCount$.subscribe(count => {
    // show badge with count
  });

  this.syncStatus.lastSync$.subscribe(ts => {
    // show "Last synced: ..." or hide if null
  });

  this.syncStatus.online$.subscribe(isOnline => {
    // show network indicator
  });
  }
  async triggerSync() {
    await this.sync.syncAll();
    this.bgSync.registerPeriodicSync();
  }
}
