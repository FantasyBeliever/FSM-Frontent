import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api/api.service';
import { LoadingSpinnerComponent } from './shared/components/ui/loading-spinner/loading-spinner.component';
import { ToastMessageComponent } from './shared/components/ui/toast-message/toast-message.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // ✅ required for *ngIf, |async, etc.
    RouterOutlet,
    LoadingSpinnerComponent,
    ToastMessageComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'fieldflow-pwa';

  constructor(private api: ApiService) {}

  ngOnInit() {

  }
}
