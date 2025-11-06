import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorTrackingService {
  logError(error: any): void {
    console.error('[ErrorTrackingService]', error);
    // TODO: push to backend endpoint like /api/errors or Sentry later
  }
}
