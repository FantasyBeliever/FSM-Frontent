import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StorageService } from '../services/storage/storage.service';
import { QueueStorageService } from '../services/storage/queue-storage.service';
import { CacheStorageService } from '../services/storage/cache-storage.service';
import { StoragePolicy } from '../services/storage/storage.policy';
import { OfflineAction } from '../models/offline-action.model';


@Injectable({ providedIn: 'root' })
export class StorageIntegrationService {
  constructor(
    private storage: StorageService,
    private queue: QueueStorageService,
    private cache: CacheStorageService,
    private policy: StoragePolicy
  ) {}

  /** 🔧 Run full storage system test */
  async runFullTest(): Promise<void> {
    console.log('🔧 Starting storage integration test...');

    // 1️⃣ Init DB + apply policy
    await this.storage.init();
    await this.policy.enforcePolicies();

    // 2️⃣ IndexedDB CRUD Test
    await firstValueFrom(
      this.storage.add('jobs', { id: 1, title: 'Fan repair', timestamp: Date.now() })
    );

  const jobs = await firstValueFrom(this.storage.getAll('jobs'));
    console.log('📦 IndexedDB jobs:', jobs);

    // 3️⃣ CacheStorage Test
    const fakeRes = new Response(JSON.stringify({ message: 'cached data' }), {
      headers: { 'Content-Type': 'application/json' },
    });
    await this.cache.put('/api/test', fakeRes);
    const cached = await this.cache.match('/api/test');
    console.log('💾 Cached response:', await cached?.json());

    // 4️⃣ Queue Test (simulate offline POST)
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      url: '/api/jobs',
      method: 'POST',
      body: { title: 'Offline Job' },
      timestamp: Date.now(),
    };

  await firstValueFrom(this.queue.enqueue(action));
  const queue = await firstValueFrom(this.queue.getAll());
    console.log('📮 Current queue:', queue);

    // 5️⃣ Cleanup enforcement
    await this.policy.enforcePolicies();
    console.log('🧹 Policies enforced and cleanup complete ✅');
  }
}
