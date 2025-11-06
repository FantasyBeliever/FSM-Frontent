import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { TokenService } from '../services/auth/token.service';
import { SessionService } from '../services/auth/session.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly excludedEndpoints = ['/auth/login', '/auth/refresh'];

  constructor(
    private tokenService: TokenService,
    private sessionService: SessionService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip certain URLs
    if (this.isExcluded(req.url)) {
      return next.handle(req);
    }

    // Fetch token asynchronously (supports Capacitor)
    return from(this.tokenService.getToken()).pipe(
      mergeMap((token) => {
        const cloned = token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req;
        return next.handle(cloned);
      }),
      catchError((error) => this.handle401(error))
    );
  }

  /** ---------- Helper Methods ---------- **/

  private isExcluded(url: string): boolean {
    return this.excludedEndpoints.some((endpoint) => url.includes(endpoint));
  }

  private handle401(error: any): Observable<never> {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      console.warn('[AuthInterceptor] 401 detected — logging out');
      this.sessionService.logout();
    }
    return throwError(() => error);
  }
}
