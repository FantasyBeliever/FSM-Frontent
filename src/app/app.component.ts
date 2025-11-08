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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // ✅ required for *ngIf, |async, etc.
    RouterOutlet,
    LoadingSpinnerComponent,
    ToastMessageComponent,
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
    private bgSync: BackgroundSyncService
  ) {}

  ngOnInit() {
    this.storageTest.runFullTest();
  }
  async triggerSync() {
    await this.sync.syncAll();
    this.bgSync.registerPeriodicSync();
  }
}
