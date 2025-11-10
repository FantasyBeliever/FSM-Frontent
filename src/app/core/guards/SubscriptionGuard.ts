import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription/subscription.service';



@Injectable({ providedIn: 'root' })
export class SubscriptionGuard implements CanActivate {
  constructor(private subs: SubscriptionService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const planId = this.subs.getCurrentPlan();
    // Allow access if they have any plan ID (assuming free plan would be null)
    if (planId) return true;
    alert('Upgrade your plan to access this feature.');
    return this.router.parseUrl('/subscription/upgrade');
  }
}
