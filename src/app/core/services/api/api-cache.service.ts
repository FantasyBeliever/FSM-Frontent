import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

export interface CacheEntry<T> {
  data: T;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiCacheService {
  /** Internal cache storage */
  private cache = new Map<string, CacheEntry<any>>();

  /** Default TTL = 5 minutes */
  private readonly defaultTTL = 5 * 60 * 1000;

  /** ------------------ Public API ------------------ **/

  /** 
   * Returns an Observable that serves from cache if valid, 
   * otherwise subscribes to fallback$ and caches result.
   */
  getCached<T>(
    key: string,
    fallback$: Observable<T>,
    ttl: number = this.defaultTTL
  ): Observable<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      console.log(`[ApiCacheService] HIT → ${key}`);
      return of(cached.data);
    }

    console.log(`[ApiCacheService] MISS → ${key}`);
    return fallback$.pipe(tap(data => this.set(key, data, ttl)));
  }

  /** Manually set a cache entry */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  /** Retrieve directly (returns null if expired or not found) */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  /** Remove a specific key */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /** Clear entire cache */
  clear(): void {
    this.cache.clear();
  }

  /** List all current keys (for debugging) */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Check if a key is cached and valid */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return true;
    }
    this.cache.delete(key);
    return false;
  }
}
