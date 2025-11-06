import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingCount = 0;
  private readonly _isLoading = new BehaviorSubject<boolean>(false);

  readonly isLoading$ = this._isLoading.asObservable();

  start(): void {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      console.log('[LoadingService] started');
      this._isLoading.next(true);
    }
  }

  stop(): void {
    this.loadingCount = Math.max(this.loadingCount - 1, 0);
    if (this.loadingCount === 0) {
      console.log('[LoadingService] stopped');
      this._isLoading.next(false);
    }
  }

  reset(): void {
    this.loadingCount = 0;
    this._isLoading.next(false);
  }
}
