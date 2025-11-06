import { Injectable } from '@angular/core';
import { Observable, throwError, timer, MonoTypeOperatorFunction } from 'rxjs';
import { mergeMap, retryWhen } from 'rxjs/operators';

export interface RetryOptions {
  maxRetryAttempts?: number;
  scalingDuration?: number;   // delay in ms
  excludedStatusCodes?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiRetryService {

  /**
   * Returns an RxJS operator that retries a failed observable stream
   * with exponential backoff and optional excluded status codes.
   */
  retryStrategy<T>({
    maxRetryAttempts = 3,
    scalingDuration = 1000,
    excludedStatusCodes = []
  }: RetryOptions = {}): MonoTypeOperatorFunction<T> {

    return (source: Observable<T>) =>
      source.pipe(
        retryWhen(errors =>
          errors.pipe(
            mergeMap((error, retryIndex) => {
              const attempt = retryIndex + 1;
              const shouldRetry =
                attempt <= maxRetryAttempts &&
                !(error?.status && excludedStatusCodes.includes(error.status));

              if (shouldRetry) {
                const delay = scalingDuration * Math.pow(2, retryIndex);
                console.log(
                  `[ApiRetryService] Retry ${attempt}/${maxRetryAttempts} after ${delay}ms`
                );
                return timer(delay);
              }

              return throwError(() => error);
            })
          )
        )
      );
  }
}
