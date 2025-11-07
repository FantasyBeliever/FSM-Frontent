import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class OfflineGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (navigator.onLine) return true;
    alert('You are offline. Please connect to the internet.');
    return this.router.parseUrl('/offline');
  }
}
