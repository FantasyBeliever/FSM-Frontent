import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { environment } from '../../../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<any>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private sessionService: SessionService
  ) {}

  /** ---------- Public API ---------- **/

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(async (res) => {
        if (res.accessToken) {
          await this.tokenService.setToken(res.accessToken);
        }
        if (res.user) {
          this.currentUserSubject.next(res.user);
          this.sessionService.setUser(res.user);
        }
      }),
      catchError((error) => {
        console.error('[AuthService] login failed', error);
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<string> {
    return of(null).pipe(
      switchMap(() => this.tokenService.getToken()),
      switchMap((token) => {
        if (!token) {
          return throwError(() => new Error('No token to refresh'));
        }
        return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, { token });
      }),
      tap(async (res) => {
        if (res.accessToken) {
          await this.tokenService.setToken(res.accessToken);
          console.log('[AuthService] token refreshed');
        }
      }),
      map((res) => res.accessToken),
      catchError((err) => {
        console.error('[AuthService] refresh failed', err);
        this.sessionService.logout();
        return throwError(() => err);
      })
    );
  }

  async logout(): Promise<void> {
    await this.tokenService.clearToken();
    this.sessionService.logout();
    this.currentUserSubject.next(null);
  }

  /** Decode JWT (optional helper) */
  decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (e) {
      console.error('[AuthService] Failed to decode token', e);
      return null;
    }
  }
}
