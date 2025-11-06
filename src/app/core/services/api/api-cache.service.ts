import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

export interface CacheEntry<T> {
  data: T;
  expiry: number;  // timestamp when it expires
}

@Injectable({
  providedIn: 'root'
})
export class ApiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /** Get from cache if not expired, otherwise execute Observable and cache result */
  getCached<T>(key: string, fallback$: Observable<T>, ttl: number = this.defaultTTL): Observable<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (entry && entry.expiry > now) {
      // ✅ still valid
      return of(entry.data);
    }

    // ❌ expired or not present → call fallback
    return fallback$.pipe(
      tap((data) => this.set(key, data, ttl))
    );
  }

  /** Directly store value in cache */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  /** Remove a specific key */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /** Clear all cache entries */
  clear(): void {
    this.cache.clear();
  }

  /** Optional: expose current keys (for debug) */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
