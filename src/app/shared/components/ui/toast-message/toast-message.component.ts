import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage, ToastService } from '../../../../core/services/notification/toast.service';


@Component({
  selector: 'app-toast-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-message.component.html',
  styleUrls: ['./toast-message.component.scss']
})
export class ToastMessageComponent implements OnInit {
  toasts: ToastMessage[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$.subscribe(toasts => (this.toasts = toasts));
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✔';
      case 'error': return '✖';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }
}
