import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  data?: any;
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly VAPID_PUBLIC_KEY = (environment as any).vapidPublicKey || '';
  private readonly registerEndpoint = `${environment.apiBaseUrl}/notifications/register`;

  private messagesSubject = new BehaviorSubject<PushMessage | null>(null);
  messages$ = this.messagesSubject.asObservable();

  private subscribed = false;
  private subscriptionObject: PushSubscription | null = null;

  constructor(private swPush: SwPush, private http: HttpClient) {
    if (this.swPush.isEnabled) {
      this.listenToMessages();
    } else {
      console.warn('[PushNotificationService] Service Worker Push not enabled');
    }
  }

  /** Request permission and subscribe to push notifications */
  async subscribeToNotifications(userId: string): Promise<void> {
    if (!this.swPush.isEnabled) {
      console.warn('[PushNotificationService] Push not supported or disabled');
      return;
    }

    try {
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });

      this.subscriptionObject = sub;
      await this.sendSubscriptionToServer(userId, sub);
      this.subscribed = true;
      console.log('[PushNotificationService] Subscription successful');
    } catch (err) {
      console.error('[PushNotificationService] Subscription failed', err);
    }
  }

  /** Unsubscribe from push */
  async unsubscribe(): Promise<void> {
    try {
      const subs = await firstValueFrom(this.swPush.subscription);
      if (subs) {
        await subs.unsubscribe();
        this.subscribed = false;
        this.subscriptionObject = null;
        console.log('[PushNotificationService] Unsubscribed');
      }
    } catch (err) {
      console.error('[PushNotificationService] Unsubscribe failed', err);
    }
  }

  /** Send subscription details to backend */
  private async sendSubscriptionToServer(userId: string, sub: PushSubscription): Promise<void> {
    try {
      await this.http
        .post(this.registerEndpoint, {
          userId,
          endpoint: sub.endpoint,
          keys: {
            p256dh: this.encodeKey(sub.getKey('p256dh')),
            auth: this.encodeKey(sub.getKey('auth'))
          }
        })
        .toPromise();
      console.log('[PushNotificationService] Subscription registered with server');
    } catch (err) {
      console.error('[PushNotificationService] Backend registration failed', err);
    }
  }

  /** Listen to messages received via Service Worker */
  private listenToMessages(): void {
    this.swPush.messages.subscribe((msg: any) => {
      const parsed: PushMessage = {
        title: msg?.notification?.title || msg?.title || 'Notification',
        body: msg?.notification?.body || msg?.body || '',
        icon: msg?.notification?.icon || '/assets/icons/icon-192x192.png',
        data: msg?.data || msg,
        timestamp: Date.now()
      };
      this.messagesSubject.next(parsed);
      console.log('[PushNotificationService] Message received:', parsed);
    });

    this.swPush.notificationClicks.subscribe((event) => {
      console.log('[PushNotificationService] Notification click:', event);
      if (event.notification?.data?.url) {
        window.open(event.notification.data.url, '_blank');
      }
    });
  }

  /** Encode ArrayBuffer keys for transmission */
  private encodeKey(key: ArrayBuffer | null): string {
    if (!key) return '';
    return btoa(String.fromCharCode.apply(null, new Uint8Array(key) as any));
  }

  /** Get current subscription state */
  isSubscribed(): boolean {
    return this.subscribed;
  }

  getSubscription(): PushSubscription | null {
    return this.subscriptionObject;
  }
}
