import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiCacheService } from '../services/api/api-cache.service';

@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  constructor(private cache: ApiCacheService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    // Use full URL including params as key
    const cacheKey = req.urlWithParams;
    const cached = this.cache['cache']?.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      // ✅ Serve from memory
      const response = new HttpResponse({
        body: cached.data,
        status: 200,
        statusText: 'OK (from cache)',
        url: req.url
      });
      console.log(`[CacheInterceptor] HIT ${req.url}`);
      return of(response);
    }

    // ❌ Miss — forward request and cache response
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse && event.status === 200) {
          this.cache.set(cacheKey, event.body);
          console.log(`[CacheInterceptor] MISS → cached ${req.url}`);
        }
      })
    );
  }
}
