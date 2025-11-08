import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';
import { PushNotificationService } from './push-notification.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { SystemStatusService } from '../system/system-status.service';
import { SyncStatusService } from '../sync/sync-status.service';
import { filter } from 'rxjs/operators';

export type NotificationChannel = 'toast' | 'push' | 'whatsapp';

export interface NotificationPayload {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  phone?: string;
  context?: Record<string, any>;
  channels?: NotificationChannel[];
  persistent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationOrchestratorService {
  private ownerPhone = '+919876543210'; // temporary default (to be dynamic)

  constructor(
    private toast: ToastService,
    private push: PushNotificationService,
    private whatsapp: WhatsAppNotificationService,
    private systemStatus: SystemStatusService,
    private syncStatus: SyncStatusService
  ) {
    this.bindSyncEvents();
  }

  /** Bind SyncService-related events to notifications */
  private bindSyncEvents(): void {
    this.syncStatus.isSyncing$
      .pipe(filter((v) => v === true))
      .subscribe(() => {
        this.notify({
          title: 'Sync Started',
          message: 'Offline data syncing in background...',
          type: 'info',
          channels: ['toast']
        });
      });

    this.syncStatus.isSyncing$
      .pipe(filter((v) => v === false))
      .subscribe(() => {
        this.notify({
          title: 'Sync Complete',
          message: 'All offline data has been synchronized successfully.',
          type: 'success',
          channels: ['toast', 'whatsapp']
        });
      });
  }

  /** Generic unified notification entry point */
  notify(payload: NotificationPayload): void {
    const {
      title,
      message,
      type = 'info',
      channels = ['toast'],
      phone,
      context,
      persistent = false
    } = payload;

    // Toast channel
    if (channels.includes('toast')) {
      this.toast.show(`${title}: ${message}`, type, undefined, persistent);
    }

    // Push channel (requires active subscription)
    if (channels.includes('push') && this.push.isSubscribed()) {
      const pushMsg = { title, body: message, data: context };
      console.log('[NotificationOrchestrator] sending push', pushMsg);
      // In real backend integration, the server sends actual push payloads; 
      // here we only simulate local display:
      this.toast.show(`${title}: (Push simulated) ${message}`, 'info');
    }

    // WhatsApp channel (owner alerts or transactional)
    if (channels.includes('whatsapp')) {
      const phoneToUse = phone || this.ownerPhone;
      this.whatsapp
        .send(
          phoneToUse,
          `${title}: ${message}`,
          context
        )
        .subscribe(() => console.log(`[NotificationOrchestrator] WhatsApp queued to ${phoneToUse}`));
    }
  }

  /** Specialized wrappers for common notification cases */
  notifyJobCreated(jobId: string, customerName: string): void {
    this.notify({
      title: 'New Job Created',
      message: `Job ${jobId} created for ${customerName}`,
      type: 'success',
      channels: ['toast', 'whatsapp']
    });
  }

  notifyPaymentReceived(amount: number, customerName: string): void {
    this.notify({
      title: 'Payment Received',
      message: `${customerName} paid ₹${amount}`,
      type: 'success',
      channels: ['toast', 'push']
    });
  }

  notifyError(err: string): void {
    this.notify({
      title: 'System Error',
      message: err,
      type: 'error',
      channels: ['toast', 'whatsapp']
    });
  }

  notifyOfflineMode(): void {
    this.notify({
      title: 'Offline Mode',
      message: 'You are offline — updates will sync automatically later.',
      type: 'warning',
      channels: ['toast'],
      persistent: true
    });
  }

  notifyBackOnline(): void {
    this.notify({
      title: 'Back Online',
      message: 'Connection restored — syncing pending data now.',
      type: 'info',
      channels: ['toast']
    });
  }
}
