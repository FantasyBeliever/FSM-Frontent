import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SessionService } from '../services/auth/session.service';

@Injectable({ providedIn: 'root' })
export class TechnicianGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.session.isTechnician()) return true;
    return this.router.parseUrl('/not-authorized');
  }
}
