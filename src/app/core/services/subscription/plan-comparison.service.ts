import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, BehaviorSubject } from 'rxjs';
import { IndexedDbService } from '../storage/indexed-db.service';
import { SubscriptionService, PlanModel } from './subscription.service';

@Injectable({ providedIn: 'root' })
export class PlanComparisonService {
  private readonly plansAsset = 'assets/config/subscription-plans.json';
  private readonly cacheStore = 'plan-cache';
  private readonly cacheKey = 'plans-v1';

  private plansSubject = new BehaviorSubject<PlanModel[] | null>(null);
  plans$ = this.plansSubject.asObservable();

  constructor(
    private http: HttpClient,
    private db: IndexedDbService,
    private subscription: SubscriptionService
  ) {
    void this.loadPlans();
  }

  /** Load plans from asset; fall back to cache if offline or asset missing */
  async loadPlans(): Promise<PlanModel[]> {
    // try HTTP first
    try {
      const plans = await lastValueFrom(this.http.get<PlanModel[]>(this.plansAsset));
      if (plans && Array.isArray(plans)) {
        this.plansSubject.next(plans);
        // cache into IndexedDB
        try {
          // some IndexedDbService implementations may not declare 'put' in the type;
          // cast to any to avoid a compile-time error while keeping runtime behavior.
          await lastValueFrom((this.db as any).put(this.cacheStore, { id: this.cacheKey, plans, ts: Date.now() }));
        } catch {
          // caching failure shouldn't block functionality
        }
        return plans;
      }
    } catch {
      // ignore, will attempt cached read
    }

    // fallback to cached plans in IndexedDB
    try {
      const cached = await lastValueFrom(this.db.get<any>(this.cacheStore, this.cacheKey));
      if (cached?.plans) {
        this.plansSubject.next(cached.plans);
        return cached.plans;
      }
    } catch {
      // ignore
    }

    // final fallback: empty
    this.plansSubject.next([]);
    return [];
  }

  /** Public method to trigger reload (e.g., manual refresh) */
  async refreshPlans(): Promise<PlanModel[]> {
    return await this.loadPlans();
  }

  /** Get all plans (cached or loaded) */
  getPlansSnapshot(): PlanModel[] {
    return this.plansSubject.value ?? [];
  }

  /** Find plan by id */
  getPlanById(id: string): PlanModel | undefined {
    return (this.plansSubject.value ?? []).find(p => p.id === id);
  }

  /** Compare user's current subscription vs a target plan.
   * Returns object with differences and whether upgrade is needed.
   */
  async compareToUser(planId: string): Promise<{
    plan?: PlanModel;
    user?: { planId?: string | null; credits?: number; mode?: string };
    needsUpgrade: boolean;
    reason?: string;
  }> {
    const plan = this.getPlanById(planId);
    const userSub = this.subscription.getCurrentSubscriptionSnapshot();

    if (!plan) {
      return { plan: undefined, user: userSub ?? undefined, needsUpgrade: false, reason: 'plan-not-found' };
    }

    if (!userSub) {
      return { plan, user: undefined, needsUpgrade: true, reason: 'no-subscription' };
    }

    // if user already on same plan
    if (userSub.planId === plan.id && userSub.mode === 'subscription') {
      return { plan, user: userSub, needsUpgrade: false, reason: 'already-on-plan' };
    }

    // compare monthly credits: if plan's monthlyCredits is higher than current credits, recommend upgrade
    const currentCredits = userSub.credits || 0;
    const needsUpgrade = plan.monthlyCredits > currentCredits;

    const reason = needsUpgrade ? 'insufficient-credits' : 'sufficient-credits';

    return { plan, user: userSub, needsUpgrade, reason };
  }

  /** Recommend a plan for the user based on current usage / credits.
   * Simple heuristic: pick first plan where monthlyCredits >= targetCredits.
   */
  recommendPlanForCredits(targetCredits: number): PlanModel | null {
    const plans = (this.plansSubject.value ?? []).slice().sort((a, b) => a.monthlyCredits - b.monthlyCredits);
    for (const p of plans) {
      if (p.monthlyCredits >= targetCredits) return p;
    }
    return plans.length ? plans[plans.length - 1] : null;
  }

  /** Check if a plan exposes a named feature (feature gating) */
  async canAccessFeature(featureKey: string): Promise<boolean> {
    const userSub = this.subscription.getCurrentSubscriptionSnapshot();
    if (!userSub) return false;

    // subscription mode with plan -> check plan features
    if (userSub.mode === 'subscription' && userSub.planId) {
      const plan = this.getPlanById(userSub.planId);
      return !!plan?.features?.includes(featureKey);
    }

    // for wallet/transaction-fee mode, features are generally allowed; rely on credits check at action time
    return true;
  }
}
