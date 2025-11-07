import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tech-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tech-dashboard.component.html',
})
export class TechDashboardComponent {
  title = 'Technician Dashboard';
}
