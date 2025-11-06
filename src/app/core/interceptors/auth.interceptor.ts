import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
    // Skip auth headers for excluded endpoints
    if (this.isExcluded(req.url)) {
      return next.handle(req);
    }

    const token = this.tokenService.getToken();

    // Clone request with Authorization header if token present
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn('[AuthInterceptor] 401 detected — logging out');
          this.sessionService.logout();
        }
        return throwError(() => error);
      })
    );
  }

  private isExcluded(url: string): boolean {
    return this.excludedEndpoints.some(endpoint => url.includes(endpoint));
  }
}
