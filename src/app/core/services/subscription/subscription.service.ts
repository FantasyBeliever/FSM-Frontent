
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  // Temporary mock until Phase 2.9
  getCurrentPlan() {
    return { tier: 'pro', name: 'Pro Plan' }; // can pretend 'free' or 'pro'
  }
}
