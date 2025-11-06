import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly KEY = 'auth_token';
  private tokenSubject = new BehaviorSubject<string | null>(null);
  readonly token$ = this.tokenSubject.asObservable();

  constructor() {
    // On init, try loading any stored token
    this.loadToken();
  }

  /** ---------- Public API ---------- **/

  async setToken(token: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: this.KEY, value: token });
    } else {
      localStorage.setItem(this.KEY, token);
    }
    this.tokenSubject.next(token);
  }

  async getToken(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const result = await Preferences.get({ key: this.KEY });
      return result.value;
    } else {
      return localStorage.getItem(this.KEY);
    }
  }

  async clearToken(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: this.KEY });
    } else {
      localStorage.removeItem(this.KEY);
    }
    this.tokenSubject.next(null);
  }

  /** ---------- Internal ---------- **/

  private async loadToken(): Promise<void> {
    const existing = await this.getToken();
    if (existing) this.tokenSubject.next(existing);
  }
}
