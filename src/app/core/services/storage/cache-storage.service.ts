import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CacheStorageService {
  /** Versioned cache key – bump when schema or API format changes */
  private readonly CACHE_PREFIX = 'fieldflow-cache-v';
  private readonly VERSION = 1;

  /** Build current cache name */
  private get cacheName(): string {
    return `${this.CACHE_PREFIX}${this.VERSION}`;
  }

  /** Save a response or blob to cache */
  async put(requestUrl: string, response: Response): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      await cache.put(requestUrl, response.clone());
      console.log(`[CacheStorageService] Cached → ${requestUrl}`);
    } catch (err) {
      console.error('[CacheStorageService] put() failed', err);
    }
  }

  /** Get cached response by URL */
  async match(requestUrl: string): Promise<Response | undefined> {
    try {
      const cache = await caches.open(this.cacheName);
      const cached = await cache.match(requestUrl);
      if (cached) {
        console.log(`[CacheStorageService] HIT → ${requestUrl}`);
        return cached;
      }
      return undefined;
    } catch (err) {
      console.error('[CacheStorageService] match() failed', err);
      return undefined;
    }
  }

  /** Delete specific cached item */
  async delete(requestUrl: string): Promise<boolean> {
    try {
      const cache = await caches.open(this.cacheName);
      return await cache.delete(requestUrl);
    } catch (err) {
      console.error('[CacheStorageService] delete() failed', err);
      return false;
    }
  }

  /** Clear this cache version */
  async clear(): Promise<void> {
    await caches.delete(this.cacheName);
    console.log(`[CacheStorageService] Cleared ${this.cacheName}`);
  }

  /** Remove all old cache versions */
  async cleanupOldVersions(): Promise<void> {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith(this.CACHE_PREFIX) && k !== this.cacheName)
        .map(k => caches.delete(k))
    );
    console.log('[CacheStorageService] Old cache versions cleared');
  }

  /** Pre-cache a list of assets (useful for install step) */
  async precacheAssets(urls: string[]): Promise<void> {
    const cache = await caches.open(this.cacheName);
    await cache.addAll(urls);
    console.log(`[CacheStorageService] Pre-cached ${urls.length} assets`);
  }
}
