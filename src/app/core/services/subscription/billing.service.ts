import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SubscriptionService } from './subscription.service';
import { from, lastValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PaymentOrder {
  orderId: string;
  amountRupee: number;
  currency: string;
  gateway: 'razorpay' | 'stripe';
  status: 'created' | 'paid' | 'failed';
  createdAt: number;
  receipt?: string;
}

export interface PaymentReceipt {
  id: string;
  orderId: string;
  gateway: 'razorpay' | 'stripe';
  amountRupee: number;
  creditsAdded: number;
  verified: boolean;
  timestamp: number;
  meta?: any;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly endpoint = `${environment.apiBaseUrl}/billing`;

  constructor(private http: HttpClient, private subscription: SubscriptionService) {}

  // ---------- Create payment order ----------
  async createOrder(amountRupee: number, gateway: 'razorpay' | 'stripe'): Promise<PaymentOrder> {
    const body = { amountRupee, gateway, currency: 'INR' };
    const order = await lastValueFrom(
      this.http.post<PaymentOrder>(`${this.endpoint}/create-order`, body)
    );
    console.log('[BillingService] Order created', order);
    return order;
  }

  // ---------- Handle payment success ----------
  async handlePaymentSuccess(
    userId: string,
    orderId: string,
    amountRupee: number,
    gateway: 'razorpay' | 'stripe',
    meta?: any
  ): Promise<void> {
    // Step 1: Verify payment with backend
    try {
      const verify = await lastValueFrom(
        this.http.post<{ verified: boolean }>(`${this.endpoint}/verify`, {
          orderId,
          gateway,
          amountRupee
        })
      );

      if (!verify.verified) {
        console.warn('[BillingService] Payment verification failed');
        return;
      }

      // Step 2: Convert rupees to credits
      const sub = this.subscription.getCurrentSubscriptionSnapshot();
      const rate = sub?.creditCurrencyToRupeeRate ?? 1;
      const creditsToAdd = Math.round(amountRupee / rate);

      // Step 3: Update subscription credits
      await this.subscription.topUpCredits(userId, creditsToAdd, { orderId, gateway });

      // Step 4: Save local receipt
      const receipt: PaymentReceipt = {
        id: crypto.randomUUID(),
        orderId,
        gateway,
        amountRupee,
        creditsAdded: creditsToAdd,
        verified: true,
        timestamp: Date.now(),
        meta
      };

      await lastValueFrom(this.http.post(`${this.endpoint}/record`, receipt));
      console.log('[BillingService] Payment recorded and credits added', receipt);
    } catch (err) {
      console.error('[BillingService] Payment handling failed', err);
    }
  }

  // ---------- Handle payment failure ----------
  async handlePaymentFailure(orderId: string, gateway: 'razorpay' | 'stripe', reason: any): Promise<void> {
    try {
      await lastValueFrom(
        this.http.post(`${this.endpoint}/fail`, {
          orderId,
          gateway,
          reason,
          timestamp: Date.now()
        })
      );
      console.warn('[BillingService] Payment failed logged', { orderId, reason });
    } catch (err) {
      console.error('[BillingService] Failed to log failed payment', err);
    }
  }

  // ---------- Auto top-up ----------
  async autoTopUpIfLow(userId: string, thresholdCredits = 50): Promise<void> {
    const credits = await this.subscription.getCredits();
    if (credits <= thresholdCredits) {
      console.log('[BillingService] Credits low, triggering auto top-up...');
      const amount = 100; // ₹100 → 100 credits by default
      const order = await this.createOrder(amount, 'razorpay');
      // In production: redirect or open Razorpay widget here
      await this.handlePaymentSuccess(userId, order.orderId, amount, 'razorpay');
    }
  }

  // ---------- Apply 1% transaction fee ----------
  async applyTransactionFee(userId: string, amountRupee: number, meta?: any): Promise<void> {
    await this.subscription.applyTransactionFee(userId, amountRupee, meta);
    await lastValueFrom(
      this.http.post(`${this.endpoint}/fee`, {
        userId,
        amountRupee,
        meta,
        timestamp: Date.now()
      })
    );
  }
}
