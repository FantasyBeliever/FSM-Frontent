import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';


@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /** -------------------- Core Request Methods -------------------- **/

  get<T>(endpoint: string, params?: Record<string, any>): Observable<ApiResponse<T>> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { params: httpParams })
      .pipe(
        tap(() => this.log('GET', endpoint)),
        catchError(this.handleError)
      );
  }

  post<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<ApiResponse<T>> {
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
    return this.http
      .delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`)
      .pipe(
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
