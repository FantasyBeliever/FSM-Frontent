import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { ApiRetryService } from './api-retry.service';
import { ApiCacheService } from './api-cache.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private retry: ApiRetryService,
    private cache: ApiCacheService
  ) {}

  /** -------------------- Core Request Methods -------------------- **/

  get<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Observable<ApiResponse<T>> {
    const key = `${endpoint}?${JSON.stringify(params || {})}`;
    const httpParams = new HttpParams({ fromObject: params || {} });
    const request$ = this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { params: httpParams })
      .pipe(
        this.retry.retryStrategy<ApiResponse<T>>({
          maxRetryAttempts: 3,
          scalingDuration: 500,
        }),
        tap(() => this.log('GET', endpoint)),
        catchError(this.handleError)
      );

    // ✅ Serve from cache if available
    return this.cache.getCached<ApiResponse<T>>(key, request$, 2 * 60 * 1000);
  }

  post<T>(
    endpoint: string,
    body: any,
    headers?: HttpHeaders
  ): Observable<ApiResponse<T>> {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body, { headers })
      .pipe(
        tap(() => this.log('POST', endpoint)),
        catchError(this.handleError)
      );
  }

  put<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    return this.http
      .put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body)
      .pipe(
        tap(() => this.log('PUT', endpoint)),
        catchError(this.handleError)
      );
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`).pipe(
      tap(() => this.log('DELETE', endpoint)),
      catchError(this.handleError)
    );
  }

  /** -------------------- Helpers -------------------- **/

  private log(method: string, endpoint: string): void {
    if (environment.enableDebug) {
      console.log(`[ApiService] ${method}: ${this.baseUrl}${endpoint}`);
    }
  }

  private handleError(error: any) {
    console.error('[ApiService] Error:', error);
    return throwError(() => error);
  }
}
