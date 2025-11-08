import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // in ms
  persistent?: boolean;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private defaultDuration = 4000;

  /** Show a toast message */
  show(message: string, type: ToastType = 'info', duration?: number, persistent = false): void {
    const toast: ToastMessage = {
      id: crypto.randomUUID(),
      message,
      type,
      duration: duration ?? this.defaultDuration,
      persistent,
      timestamp: Date.now()
    };

    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);
    console.log(`[ToastService] ${type.toUpperCase()}: ${message}`);

    if (!persistent) {
      setTimeout(() => this.dismiss(toast.id), toast.duration);
    }
  }

  /** Dismiss toast by ID */
  dismiss(id: string): void {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }

  /** Clear all toasts */
  clearAll(): void {
    this.toastsSubject.next([]);
  }
}
