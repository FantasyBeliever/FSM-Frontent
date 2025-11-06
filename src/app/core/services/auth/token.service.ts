import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly KEY = 'auth_token';

  getToken(): string | null {
    return localStorage.getItem(this.KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(this.KEY);
  }
}
