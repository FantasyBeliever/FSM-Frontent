import { Injectable } from '@angular/core';
import { NotificationOrchestratorService } from '../services/notification/notification-orchestrator.service';
import { PushNotificationService } from '../services/notification/push-notification.service';
import { ToastService } from '../services/notification/toast.service';
import { WhatsAppNotificationService } from '../services/notification/whatsapp-notification.service';
import { SyncStatusService } from '../services/sync/sync-status.service';
import { SystemStatusService } from '../services/system/system-status.service';

@Injectable({ providedIn: 'root' })
export class NotificationIntegrationService {
  constructor(
    private orchestrator: NotificationOrchestratorService,
    private push: PushNotificationService,
    private toast: ToastService,
    private whatsapp: WhatsAppNotificationService,
    private sync: SyncStatusService,
    private systemStatus: SystemStatusService
  ) {}

  async runNotificationTest(): Promise<void> {
    console.log('--- Notification Integration Test: START ---');

    // 1. Ensure push subscription
    try {
      console.log('Attempting push subscription if available...');
      await this.push.subscribeToNotifications('user-test');
    } catch (err) {
      console.warn('[Integration] Push not available or subscription failed:', String(err));
    }

    // 2. Simulate system online/offline state
    const snapshot = this.systemStatus.getSnapshot();
    console.log('[Integration] System snapshot before test:', snapshot);

    // 3. Simulate job creation
    console.log('[Integration] Simulating job creation...');
    this.orchestrator.notifyJobCreated('JOB-001', 'Amit Sharma');

    // 4. Simulate payment event
    setTimeout(() => {
      console.log('[Integration] Simulating payment received...');
      this.orchestrator.notifyPaymentReceived(2500, 'Amit Sharma');
    }, 2000);

    // 5. Simulate sync events
    console.log('[Integration] Simulating sync start and completion...');
    this.orchestrator.notify({
      title: 'Sync Started',
      message: 'Triggered manually for integration test',
      type: 'info',
      channels: ['toast']
    });

    setTimeout(() => {
      this.orchestrator.notify({
        title: 'Sync Complete',
        message: 'Offline updates successfully synchronized.',
        type: 'success',
        channels: ['toast', 'whatsapp']
      });
    }, 3000);

    // 6. Simulate an error
    setTimeout(() => {
      console.log('[Integration] Simulating system error...');
      this.orchestrator.notifyError('Failed to fetch technician list');
    }, 4000);

    // 7. Simulate offline queue and recovery
    console.log('[Integration] Simulating offline message queue...');
    await this.whatsapp.send(
      '+919999999999',
      'Offline Test: Job {{jobId}} created while offline.',
      { jobId: 'JOB-002' }
    ).toPromise();

    console.log('[Integration] WhatsApp message queued (offline).');

    console.log('[Integration] Forcing flush (simulate reconnect)...');
    await this.whatsapp.flushPending();

    // 8. Final summary snapshot
    setTimeout(() => {
      const finalSnap = this.systemStatus.getSnapshot();
      console.log('[Integration] System snapshot after test:', finalSnap);
      console.log('--- Notification Integration Test: COMPLETE ---');
    }, 5000);
  }
}
