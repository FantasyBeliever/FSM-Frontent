import { Injectable } from '@angular/core';
import { SubscriptionService } from '../services/subscription/subscription.service';
import { BillingService } from '../services/subscription/billing.service';
import { PlanComparisonService } from '../services/subscription/plan-comparison.service';
import { SyncStatusService } from '../services/sync/sync-status.service';
import { ToastService } from '../services/notification/toast.service';

@Injectable({ providedIn: 'root' })
export class SubscriptionIntegrationService {
  constructor(
    private subscription: SubscriptionService,
    private billing: BillingService,
    private plans: PlanComparisonService,
    private syncStatus: SyncStatusService,
    private toast: ToastService
  ) {}

  async runIntegrationTest(): Promise<void> {
    console.log('--- Subscription Integration Test START ---');

    // 1. Ensure we have some plans loaded
    const plans = await this.plans.loadPlans();
    console.log('Plans available:', plans);

    // 2. Top-up credits using BillingService (simulated payment)
    const order = await this.billing.createOrder(200, 'razorpay');
    await this.billing.handlePaymentSuccess('user-demo', order.orderId, order.amountRupee, order.gateway);

    // 3. Check current credits
    const credits = await this.subscription.getCredits();
    console.log('[Integration] Credits after top-up:', credits);

    // 4. Consume credits for feature usage
    const used = await this.subscription.tryConsume('user-demo', 50, 'job_creation');
    console.log('[Integration] Consumed 50 credits ->', used);
    const afterConsume = await this.subscription.getCredits();
    console.log('[Integration] Credits after consume:', afterConsume);

    // 5. Assign a plan to user (simulate upgrade)
    const proPlan = this.plans.getPlanById('pro') || plans.find(p => p.id === 'pro');
    if (proPlan) {
      await this.subscription.setPlan('user-demo', proPlan);
      this.toast.show(`Subscribed to ${proPlan.name} Plan`, 'success');
      console.log('[Integration] Plan assigned:', proPlan);
    } else {
      console.warn('[Integration] Pro plan not found in config');
    }

    // 6. Check entitlement logic
    const hasFeature = await this.plans.canAccessFeature('pro-reports');
    console.log('[Integration] Can access "pro-reports"?', hasFeature);

    // 7. Auto top-up trigger if credits low
    await this.billing.autoTopUpIfLow('user-demo', 100);
    const finalCredits = await this.subscription.getCredits();
    console.log('[Integration] Credits after auto top-up:', finalCredits);

    // 8. Simulate offline: store a top-up locally and verify queued
    console.log('[Integration] Simulating offline mode...');
    (navigator as any).__defineGetter__('onLine', () => false);
    await this.subscription.topUpCredits('user-demo', 100);
    console.log('[Integration] Offline top-up recorded.');
    (navigator as any).__defineGetter__('onLine', () => true);
    await this.syncStatus.online$.subscribe(() => this.subscription.flushTransactionsToServer());
    console.log('[Integration] Queued transactions flushed after reconnect.');

    // 9. Compare plans for upgrade suggestion
    const cmp = await this.plans.compareToUser('enterprise');
    console.log('[Integration] Comparison to Enterprise Plan:', cmp);

    console.log('--- Subscription Integration Test COMPLETE ---');
  }
}
