import { Injectable } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';
import { CacheStorageService } from './cache-storage.service';

export interface StoragePolicyRule {
  storeName: string;
  ttlMs?: number;        // how long items should live
  maxItems?: number;     // max items allowed
}

@Injectable({ providedIn: 'root' })
export class StoragePolicy {
  /** default values */
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly DEFAULT_MAX_ITEMS = 1000;

  /** Define per-store policies */
  private rules: StoragePolicyRule[] = [
    { storeName: 'jobs', ttlMs: 3 * 24 * 60 * 60 * 1000, maxItems: 500 },
    { storeName: 'technicians', ttlMs: 7 * 24 * 60 * 60 * 1000, maxItems: 300 },
    { storeName: 'customers', ttlMs: 14 * 24 * 60 * 60 * 1000, maxItems: 1000 },
    { storeName: 'payments', ttlMs: 30 * 24 * 60 * 60 * 1000, maxItems: 1000 },
    { storeName: 'sync-queue', ttlMs: 2 * 24 * 60 * 60 * 1000, maxItems: 200 },
  ];

  constructor(
    private indexedDb: IndexedDbService,
    private cacheService: CacheStorageService
  ) {}

  /** Clean up expired or over-limit data across all stores */
  async enforcePolicies(): Promise<void> {
    for (const rule of this.rules) {
      await this.applyRule(rule);
    }
    // Also clear old cache versions
    await this.cacheService.cleanupOldVersions();
    console.log('[StoragePolicy] Policies enforced successfully');
  }

  /** ---------- Internal Logic ---------- **/

  private async applyRule(rule: StoragePolicyRule): Promise<void> {
    const now = Date.now();
    try {
      const items = await this.indexedDb.getAll<any>(rule.storeName).toPromise();
      if (!items || items.length === 0) return;

      const ttl = rule.ttlMs ?? this.DEFAULT_TTL;
      const max = rule.maxItems ?? this.DEFAULT_MAX_ITEMS;

      const expiredItems = items.filter((i: any) => i.timestamp && now - i.timestamp > ttl);
      for (const item of expiredItems) {
        await this.indexedDb.delete(rule.storeName, item.id).toPromise();
      }

      if (items.length > max) {
        const sorted = items.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
        const excess = sorted.slice(0, items.length - max);
        for (const item of excess) {
          await this.indexedDb.delete(rule.storeName, item.id).toPromise();
        }
      }

      if (expiredItems.length > 0)
        console.log(`[StoragePolicy] Cleared ${expiredItems.length} expired from ${rule.storeName}`);
    } catch (err) {
      console.warn(`[StoragePolicy] Failed to apply rule for ${rule.storeName}`, err);
    }
  }
}
