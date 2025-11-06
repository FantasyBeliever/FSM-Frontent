import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Router } from '@angular/router';
import { TokenService } from './token.service';

export interface UserSession {
  id: number;
  name: string;
  email?: string;
  role: 'owner' | 'technician' | 'admin';
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isLoggedIn$ = this.currentUserSubject.asObservable().pipe(
    // Derived boolean stream
    map((user) => !!user)
  );

  constructor(private tokenService: TokenService, private router: Router) {
    this.loadSession();
  }

  /** Load existing session (on app start) */
  private loadSession(): void {
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.currentUserSubject.next(user);
      } catch {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  /** Set current user and persist */
  setUser(user: UserSession): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /** Return current user (sync) */
  getUser(): UserSession | null {
    return this.currentUserSubject.value;
  }

  /** Simple role-based helpers */
  isOwner(): boolean {
    return this.currentUserSubject.value?.role === 'owner';
  }

  isTechnician(): boolean {
    return this.currentUserSubject.value?.role === 'technician';
  }

  /** Clear session + token + redirect */
  async logout(): Promise<void> {
    await this.tokenService.clearToken();
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }
}
