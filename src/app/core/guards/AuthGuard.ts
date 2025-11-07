import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, map } from 'rxjs';
import { SessionService } from '../services/auth/session.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.session.currentUser$.pipe(
      map((user) => (user ? true : this.router.parseUrl('/auth/login')))
    );
  }
}
