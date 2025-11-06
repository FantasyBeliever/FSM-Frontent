import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _messages = new Subject<ToastMessage>();
  messages$ = this._messages.asObservable();

  show(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this._messages.next({ text, type });
  }
}
