import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionIntegrationService } from './subscription-integration.service';

@Component({
  selector: 'app-subscription-integration-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="position:fixed;bottom:110px;left:12px;z-index:9999">
      <button (click)="runTest()" style="padding:8px 12px;">Run Subscription Test</button>
    </div>`
})
export class SubscriptionIntegrationTriggerComponent {
  constructor(private svc: SubscriptionIntegrationService) {}
  async runTest(): Promise<void> {
    await this.svc.runIntegrationTest();
  }
}
