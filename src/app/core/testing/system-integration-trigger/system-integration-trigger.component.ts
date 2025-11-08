import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemIntegrationService } from '../system-integration.service';


@Component({
  selector: 'app-system-integration-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `<div style="position:fixed;left:12px;bottom:12px;z-index:9999">
    <button (click)="run()" style="padding:8px 12px">Run System Integration</button>
  </div>`
})
export class SystemIntegrationTriggerComponent {
  constructor(private svc: SystemIntegrationService) {}
  run() {
    this.svc.runAllChecks().catch(err => console.error('Integration run failed', err));
  }
}
