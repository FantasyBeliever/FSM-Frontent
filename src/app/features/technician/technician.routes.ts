import { Routes } from '@angular/router';
import { TechDashboardComponent } from './tech-dashboard/tech-dashboard.component';

export const TECHNICIAN_ROUTES: Routes = [
  { path: 'tech-dashboard', component: TechDashboardComponent },
  { path: '', redirectTo: 'tech-dashboard', pathMatch: 'full' },
];
