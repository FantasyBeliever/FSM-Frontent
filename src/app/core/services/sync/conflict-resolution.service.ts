import { Injectable } from '@angular/core';
import { IndexedDbService } from '../storage/indexed-db.service';
import { ApiService } from '../api/api.service';
import { OfflineAction } from '../storage/queue-storage.service';

export type ConflictStrategy =
  | 'local-wins'
  | 'server-wins'
  | 'merge-latest'
  | 'custom';

export interface ConflictContext<T = any> {
  store: string;
  localData: T;
  serverData: T;
  action: OfflineAction;
  conflictReason?: string;
}

@Injectable({ providedIn: 'root' })
export class ConflictResolutionService {
  private defaultStrategy: ConflictStrategy = 'server-wins';

  constructor(
    private api: ApiService,
    private db: IndexedDbService
  ) {}

  // Main entry
  async resolve<T>(ctx: ConflictContext<T>): Promise<boolean> {
    switch (this.defaultStrategy) {
      case 'local-wins':
        return this.localWins(ctx);
      case 'server-wins':
        return this.serverWins(ctx);
      case 'merge-latest':
        return this.mergeLatest(ctx);
      case 'custom':
        return this.customResolution(ctx);
      default:
        return false;
    }
  }

  // --- Strategies ---

  private async localWins<T>(ctx: ConflictContext<T>): Promise<boolean> {
    try {
      await this.api.put(ctx.action.url, ctx.localData).toPromise();
      await this.db.update(ctx.store, ctx.localData).toPromise();
      console.log('[ConflictResolutionService] Local data overwrote server version');
      return true;
    } catch (err) {
      console.warn('[ConflictResolutionService] localWins failed', err);
      return false;
    }
  }

  private async serverWins<T>(ctx: ConflictContext<T>): Promise<boolean> {
    try {
      const serverData = await this.api.get<T>(ctx.action.url).toPromise();
      if (serverData) {
        await this.db.update(ctx.store, serverData).toPromise();
      }
      console.log('[ConflictResolutionService] Server version retained');
      return true;
    } catch (err) {
      console.warn('[ConflictResolutionService] serverWins failed', err);
      return false;
    }
  }

  private async mergeLatest<T extends { updatedAt?: number }>(
    ctx: ConflictContext<T>
  ): Promise<boolean> {
    try {
      const localTime = ctx.localData?.updatedAt || 0;
      const serverTime = ctx.serverData?.updatedAt || 0;

      const merged = localTime >= serverTime ? ctx.localData : ctx.serverData;
      await this.db.update(ctx.store, merged).toPromise();

      if (merged === ctx.localData) {
        await this.api.put(ctx.action.url, merged).toPromise();
        console.log('[ConflictResolutionService] Local newer → pushed to server');
      } else {
        console.log('[ConflictResolutionService] Server newer → updated local');
      }

      return true;
    } catch (err) {
      console.warn('[ConflictResolutionService] mergeLatest failed', err);
      return false;
    }
  }

  private async customResolution<T>(ctx: ConflictContext<T>): Promise<boolean> {
    console.log('[ConflictResolutionService] Custom resolution hook');
    // Placeholder: integrate user prompt or domain-specific merge
    return false;
  }

  // Optionally allow runtime strategy switching
  setStrategy(strategy: ConflictStrategy): void {
    this.defaultStrategy = strategy;
  }

  getStrategy(): ConflictStrategy {
    return this.defaultStrategy;
  }
}
