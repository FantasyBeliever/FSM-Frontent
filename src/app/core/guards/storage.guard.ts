import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StorageService } from '../services/storage/storage.service';
import { StoragePolicy } from '../services/storage/storage.policy';

@Injectable({ providedIn: 'root' })
export class StorageGuard implements CanActivate {
  private initialized = false;

  constructor(
    private storage: StorageService,
    private policy: StoragePolicy,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    if (this.initialized) return of(true);

    return from(this.initStorage()).pipe(
      map(() => {
        this.initialized = true;
        console.log('[StorageGuard] Storage ready ✅');
        return true;
      }),
      catchError((err) => {
        console.error('[StorageGuard] Initialization failed ❌', err);
        return of(this.router.parseUrl('/error'));
      })
    );
  }

  /** ---------- Internal ---------- **/

  private async initStorage(): Promise<void> {
    console.log('[StorageGuard] Initializing storage...');
    await this.storage.init();
    await this.policy.enforcePolicies();
  }
}
