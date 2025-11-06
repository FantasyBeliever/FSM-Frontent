import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/notification/toast.service';
import { ErrorTrackingService } from '../services/system/error-tracking.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private toast: ToastService,
    private errorTracker: ErrorTrackingService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let userMessage = 'Something went wrong. Please try again.';

        if (error.error instanceof ErrorEvent) {
          // Client-side or network error
          userMessage = `Network error: ${error.error.message}`;
        } else if (error.status === 0) {
          userMessage = 'Server unreachable. Check your connection.';
        } else if (error.status >= 400 && error.status < 500) {
          userMessage =
            error.error?.message || `Request failed (${error.status})`;
        } else if (error.status >= 500) {
          userMessage = 'Server is temporarily unavailable.';
        }

        // ✅ Notify user
        this.toast.show(userMessage, 'error');

        // ✅ Log for analytics/tracking
        this.errorTracker.logError({
          url: req.url,
          status: error.status,
          message: userMessage,
          raw: error,
        });

        return throwError(() => error);
      })
    );
  }
}
