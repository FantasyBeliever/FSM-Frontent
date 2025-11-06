import { Component, OnInit } from '@angular/core';
import { ToastMessage, ToastService } from '../../../../core/services/notification/toast.service';
import { Subscription, timer } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-message.component.html',
  styleUrl: './toast-message.component.scss'
})
export class ToastMessageComponent implements OnInit {
  message: ToastMessage | null = null;
  private sub!: Subscription;

  constructor(private toast: ToastService) {}

  ngOnInit() {
    this.sub = this.toast.messages$.subscribe(msg => {
      this.message = msg;
      timer(3000).subscribe(() => (this.message = null)); // auto hide
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
