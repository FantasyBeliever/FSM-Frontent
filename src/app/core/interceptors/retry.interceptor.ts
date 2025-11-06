import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiRetryService, RetryOptions } from '../services/api/api-retry.service';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {

  private readonly defaultRetry: RetryOptions = {
    maxRetryAttempts: 3,
    scalingDuration: 800,
    excludedStatusCodes: [400, 401, 403, 404]
  };

  constructor(private retryService: ApiRetryService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Retry only GET requests (idempotent)
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    const retryOperator = this.retryService.retryStrategy<HttpEvent<any>>(this.defaultRetry);
    console.log(`[RetryInterceptor] applying retry for ${req.url}`);

    return next.handle(req).pipe(retryOperator);
  }
}
