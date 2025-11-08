import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { IndexedDbService } from '../storage/indexed-db.service';
import { SyncStatusService } from '../sync/sync-status.service';
import { from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface WhatsAppMessage {
  id: string;
  phone: string;
  template: string;
  placeholders?: Record<string, any>;
  sent?: boolean;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppNotificationService {
  private readonly store = 'whatsapp-messages';
  private readonly endpoint = '/notifications/whatsapp/send';

  constructor(
    private api: ApiService,
    private db: IndexedDbService,
    private syncStatus: SyncStatusService
  ) {
    // Auto-flush messages when network becomes available
    this.syncStatus.online$.subscribe((online) => {
      if (online) {
        this.flushPending().catch(err =>
          console.warn('[WhatsAppNotificationService] flush failed', err)
        );
      }
    });
  }

  /** Queue or send WhatsApp message */
  send(phone: string, template: string, placeholders?: Record<string, any>) {
    const msg: WhatsAppMessage = {
      id: crypto.randomUUID(),
      phone,
      template,
      placeholders,
      timestamp: Date.now(),
      sent: false
    };

    return from(this.db.add(this.store, msg)).pipe(
      map(() => {
        console.log('[WhatsAppNotificationService] queued message', msg);
        if (navigator.onLine) {
          this.flushPending().catch(() => {});
        }
        return msg.id;
      }),
      catchError((err) => {
        console.warn('[WhatsAppNotificationService] failed to store message', err);
        return of('');
      })
    );
  }

  /** Process all queued messages */
  async flushPending(): Promise<void> {
    const all = await this.db.getAll<WhatsAppMessage>(this.store).toPromise();
    if (!all || all.length === 0) return;

    console.log(`[WhatsAppNotificationService] flushing ${all.length} messages...`);
    for (const msg of all) {
      const success = await this.dispatch(msg);
      if (success) {
        await this.db.delete(this.store, msg.id).toPromise();
      }
    }
  }

  /** Dispatch single message to backend */
  private async dispatch(msg: WhatsAppMessage): Promise<boolean> {
    try {
      await this.api.post(this.endpoint, msg).toPromise();
      console.log(`[WhatsAppNotificationService] sent message to ${msg.phone}`);
      return true;
    } catch (err) {
      console.warn('[WhatsAppNotificationService] dispatch failed', err);
      return false;
    }
  }

  /** Build templated message preview (for debugging or logs) */
  renderTemplate(template: string, placeholders?: Record<string, any>): string {
    if (!placeholders) return template;
    return Object.keys(placeholders).reduce((acc, key) => {
      return acc.replace(new RegExp(`{{${key}}}`, 'g'), placeholders[key]);
    }, template);
  }
}
