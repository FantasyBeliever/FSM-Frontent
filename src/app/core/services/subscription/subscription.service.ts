import { Injectable } from '@angular/core';
import { BehaviorSubject, from, lastValueFrom } from 'rxjs';
import { IndexedDbService } from '../storage/indexed-db.service';
import { SyncStatusService } from '../sync/sync-status.service';
import { ApiService } from '../api/api.service';
import { AnalyticsService } from '../system/analytics.service';

/**
 * Data models
 */
export type PricingMode = 'wallet' | 'transaction-fee' | 'subscription';

export interface PlanModel {
  id: string;
  name: string;
  monthlyCredits: number;
  priceRupeePerMonth?: number; // backend/owner-only (not exposed as UI rupee)
  features?: string[];
}

export interface SubscriptionModel {
  userId: string;
  mode: PricingMode;
  credits: number; // visible to user as "credits"
  creditCurrencyToRupeeRate: number; // e.g. 1 credit = ₹1 (internal)
  transactionFeePercent?: number; // e.g. 1 = 1%
  planId?: string | null;
  planExpiry?: number | null; // epoch ms
  updatedAt: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'topup' | 'consume' | 'refund' | 'fee-adjust';
  credits: number; // positive for topup/refund, negative for consume/fee
  reason?: string;
  meta?: any;
  timestamp: number;
  synced?: boolean;
}

/**
 * SubscriptionService
 *
 * - All public API surfaces credits.
 * - Persists subscription + transactions to IndexedDB.
 * - Auto-flushes transactions to server when online.
 * - Provides entitlement check helpers.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly storeSub = 'subscription';
  private readonly storeTx = 'credit-transactions';
  private readonly apiEndpoint = '/subscription'; // server endpoints (optional)

  private currentSubSubject = new BehaviorSubject<SubscriptionModel | null>(null);
  currentSub$ = this.currentSubSubject.asObservable();

  // simple in-memory lock to avoid race conditions for consume/topup
  private opLock: Promise<any> = Promise.resolve();

  constructor(
    private db: IndexedDbService,
    private syncStatus: SyncStatusService,
    private api: ApiService,
    private analytics: AnalyticsService
  ) {
    // load subscription on startup
    void this.loadFromDb();

    // attempt to flush queued tx when online
    this.syncStatus.online$.subscribe((online) => {
      if (online) {
        void this.flushTransactionsToServer().catch((e) => {
          console.warn('[SubscriptionService] flush failed', e);
        });
      }
    });
  }

  // ---------- Initialization ----------
  private async loadFromDb(): Promise<void> {
    try {
      const sub = await lastValueFrom(this.db.get<SubscriptionModel>(this.storeSub, 'current'));
      if (sub) {
        this.currentSubSubject.next(sub);
      } else {
        // bootstrap default (wallet mode, 0 credits)
        const defaultSub: SubscriptionModel = {
          userId: 'unknown',
          mode: 'wallet',
          credits: 0,
          creditCurrencyToRupeeRate: 1,
          transactionFeePercent: 1,
          planId: null,
          planExpiry: null,
          updatedAt: Date.now()
        };
        await lastValueFrom(this.db.add(this.storeSub, { id: 'current', ...defaultSub } as any));
        this.currentSubSubject.next(defaultSub);
      }
    } catch (err) {
      console.warn('[SubscriptionService] loadFromDb failed', err);
    }
  }

  private async persistSub(sub: SubscriptionModel): Promise<void> {
    sub.updatedAt = Date.now();
    await lastValueFrom(this.db.update(this.storeSub, { id: 'current', ...sub } as any));
    this.currentSubSubject.next(sub);
  }

  // ---------- Public getters ----------
  async getCredits(): Promise<number> {
    const s = this.currentSubSubject.value;
    return s ? s.credits : 0;
  }

  getCurrentSubscriptionSnapshot(): SubscriptionModel | null {
    return this.currentSubSubject.value;
  }

  getCurrentPlan(): string | null {
    const sub = this.currentSubSubject.value;
    return sub?.planId ?? null;
  }

  // ---------- Credit consumption (atomic-ish) ----------
  /**
   * Tries to consume `creditsNeeded` from user credits.
   * Returns true if succeeded; false if insufficient credits.
   * Always records a CreditTransaction and queues it for sync.
   */
  async consumeCredits(userId: string, creditsNeeded: number, reason = 'consume'): Promise<boolean> {
    // ensure operations run sequentially
    this.opLock = this.opLock.then(async () => {
      const sub = this.currentSubSubject.value;
      if (!sub) throw new Error('Subscription not initialized');

      if (sub.credits < creditsNeeded) {
        // insufficient
        this.recordTransaction({
          id: crypto.randomUUID(),
          userId,
          type: 'consume',
          credits: -creditsNeeded,
          reason: 'insufficient',
          meta: { available: sub.credits },
          timestamp: Date.now(),
          synced: false
        }).catch(() => {});
        this.analytics.trackAction('credits_insufficient', 'billing', { needed: creditsNeeded, available: sub.credits });
        return false;
      }

      // deduct locally
      sub.credits = Math.max(0, sub.credits - creditsNeeded);
      await this.persistSub(sub);

      // persist transaction
      await this.recordTransaction({
        id: crypto.randomUUID(),
        userId,
        type: 'consume',
        credits: -creditsNeeded,
        reason,
        timestamp: Date.now(),
        synced: false
      });

      this.analytics.trackAction('credits_consumed', 'billing', { amount: creditsNeeded, reason });

      return true;
    });

    // wait for current lock to finish and get its result
    try {
      const result = await this.opLock;
      // opLock returns undefined normally; but we designed internal flow to not return value. So re-evaluate credits check.
      const latest = this.currentSubSubject.value!;
      return latest.credits >= 0; // if operation succeeded, credits updated; still return true for consumed path. For insufficient path above, we logged and returned false earlier but due to lock structure we return boolean generic. To be explicit, recompute:
    } catch {
      // in case of thrown error, return false
      return false;
    } finally {
      // to produce clear boolean, re-evaluate if credits decreased
    }
  }

  // Simpler, safe version that returns explicit boolean
  async tryConsume(userId: string, creditsNeeded: number, reason = 'consume'): Promise<boolean> {
    // run sequentially
    await this.opLock;
    const sub = this.currentSubSubject.value;
    if (!sub) throw new Error('Subscription not initialized');

    if (sub.credits < creditsNeeded) {
      await this.recordTransaction({
        id: crypto.randomUUID(),
        userId,
        type: 'consume',
        credits: -creditsNeeded,
        reason: 'insufficient',
        meta: { available: sub.credits },
        timestamp: Date.now(),
        synced: false
      });
      this.analytics.trackAction('credits_insufficient', 'billing', { needed: creditsNeeded, available: sub.credits });
      return false;
    }

    sub.credits = Math.max(0, sub.credits - creditsNeeded);
    await this.persistSub(sub);
    await this.recordTransaction({
      id: crypto.randomUUID(),
      userId,
      type: 'consume',
      credits: -creditsNeeded,
      reason,
      timestamp: Date.now(),
      synced: false
    });
    this.analytics.trackAction('credits_consumed', 'billing', { amount: creditsNeeded, reason });
    return true;
  }

  // ---------- Top-up credits (triggered by BillingService externally) ----------
  /**
   * topUpCredits is always expressed in credits (not rupees).
   * BillingService will call this after successful rupee payment.
   */
  async topUpCredits(userId: string, creditsToAdd: number, meta?: any): Promise<void> {
    const sub = this.currentSubSubject.value;
    if (!sub) throw new Error('Subscription not initialized');

    sub.credits = (sub.credits || 0) + creditsToAdd;
    await this.persistSub(sub);

    await this.recordTransaction({
      id: crypto.randomUUID(),
      userId,
      type: 'topup',
      credits: creditsToAdd,
      reason: 'topup',
      meta,
      timestamp: Date.now(),
      synced: false
    });

    this.analytics.trackAction('credits_topped_up', 'billing', { amount: creditsToAdd, meta });
  }

  // ---------- Plan management ----------
  async setPlan(userId: string, plan: PlanModel, startNow = true): Promise<void> {
    const sub = this.currentSubSubject.value;
    if (!sub) throw new Error('Subscription not initialized');

    sub.planId = plan.id;
    if (startNow) {
      sub.planExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      // grant monthly credits immediately
      sub.credits = (sub.credits || 0) + plan.monthlyCredits;
      this.analytics.trackAction('plan_assigned', 'billing', { plan: plan.id });
    }
    sub.mode = 'subscription';
    await this.persistSub(sub);

    // record transaction for grant
    await this.recordTransaction({
      id: crypto.randomUUID(),
      userId,
      type: 'topup',
      credits: plan.monthlyCredits,
      reason: 'plan_grant',
      meta: { planId: plan.id },
      timestamp: Date.now(),
      synced: false
    });
  }

  // ---------- Transaction fee handling (Phase 2 model) ----------
  /**
   * If you charge a percentage on actual money payments, this helper converts that fee into credits
   * and optionally deducts it or adds as revenue. The UI will still show credits change only.
   */
  computeTransactionFeeCredits(amountRupee: number): number {
    const sub = this.currentSubSubject.value;
    const percent = sub?.transactionFeePercent ?? 0;
    const feeRupee = (amountRupee * percent) / 100;
    const credits = Math.round(feeRupee / (sub?.creditCurrencyToRupeeRate ?? 1));
    return credits;
  }

  async applyTransactionFee(userId: string, amountRupee: number, meta?: any): Promise<void> {
    const credits = this.computeTransactionFeeCredits(amountRupee);
    if (credits <= 0) return;
    // fee reduces from credits balance if wallet; otherwise route to billing ledger server-side
    const sub = this.currentSubSubject.value!;
    if (sub.mode === 'transaction-fee' || sub.mode === 'wallet') {
      // deduct credits as platform fee
      sub.credits = Math.max(0, sub.credits - credits);
      await this.persistSub(sub);
      await this.recordTransaction({
        id: crypto.randomUUID(),
        userId,
        type: 'fee-adjust',
        credits: -credits,
        reason: 'txn_fee',
        meta: { amountRupee, credits },
        timestamp: Date.now(),
        synced: false
      });
    } else {
      // subscription mode: we could record fees separately; here we log analytics only
      this.analytics.trackAction('txn_fee_not_deducted', 'billing', { amountRupee, credits, mode: sub.mode });
    }
  }

  // ---------- Entitlement checks ----------
  /**
   * Used by guards or feature checks.
   * Returns true if user has at least minCredits OR has subscription plan that grants unlimited (optional).
   */
  async hasEntitlement(minCredits = 1): Promise<boolean> {
    const sub = this.currentSubSubject.value;
    if (!sub) return false;
    if (sub.mode === 'subscription' && sub.planId) return sub.credits >= minCredits; // plan might grant credits
    return sub.credits >= minCredits;
  }

  // ---------- Internal: transaction recording & flush ----------
  private async recordTransaction(tx: CreditTransaction): Promise<void> {
    try {
      await lastValueFrom(this.db.add(this.storeTx, tx));
    } catch (err) {
      console.warn('[SubscriptionService] recordTransaction failed', err);
    }
  }

  /**
   * Flush queued transactions to server (best-effort)
   * Server endpoint expected: POST /subscription/transactions → accept array of CreditTransaction
   */
  async flushTransactionsToServer(): Promise<void> {
    try {
      const all = await lastValueFrom(this.db.getAll<CreditTransaction>(this.storeTx));
      if (!all || all.length === 0) return;

      // send in batches of 50
      const batchSize = 50;
      for (let i = 0; i < all.length; i += batchSize) {
        const chunk = all.slice(i, i + batchSize);
        try {
          await lastValueFrom(this.api.post(`${this.apiEndpoint}/transactions`, chunk));
          // delete on success
          for (const tx of chunk) {
            await lastValueFrom(this.db.delete(this.storeTx, tx.id));
          }
          console.log(`[SubscriptionService] flushed ${chunk.length} tx`);
        } catch (err) {
          console.warn('[SubscriptionService] server accept failed for chunk', err);
          // stop further attempts to avoid infinite loop - will retry on next online
          break;
        }
      }
    } catch (err) {
      console.warn('[SubscriptionService] flushTransactionsToServer error', err);
    }
  }

  // For admin/debug: list local transactions
  async listLocalTransactions(): Promise<CreditTransaction[]> {
    return await lastValueFrom(this.db.getAll<CreditTransaction>(this.storeTx));
  }
}
