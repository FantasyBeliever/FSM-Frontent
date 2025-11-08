import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationIntegrationService } from './notification-integration.service';

@Component({
  selector: 'app-notification-integration-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `<div style="position:fixed;bottom:60px;left:12px;z-index:9999">
      <button (click)="runTest()" style="padding:8px 12px;">Run Notification Test</button>
    </div>`
})
export class NotificationIntegrationTriggerComponent {
  constructor(private testService: NotificationIntegrationService) {}

  async runTest(): Promise<void> {
    await this.testService.runNotificationTest();
  }
}
