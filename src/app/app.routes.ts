import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { OtpVerifyComponent } from './features/auth/otp-verify/otp-verify.component';
import { RoleSelectComponent } from './features/auth/role-select/role-select.component';
import { AuthGuard } from './core/guards/AuthGuard';
import { OwnerGuard } from './core/guards/OwnerGuard';
import { SubscriptionGuard } from './core/guards/SubscriptionGuard';
import { TechnicianGuard } from './core/guards/TechnicianGuard';
import { StorageGuard } from './core/guards/storage.guard';

export const routes: Routes = [
  // 🔹 AUTH FLOW
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/otp-verify', component: OtpVerifyComponent },
  { path: 'auth/role-select', component: RoleSelectComponent },

  // 🔹 OWNER AREA (standalone lazy route)
  {
    path: 'owner',
    canActivate: [AuthGuard, OwnerGuard, SubscriptionGuard, StorageGuard],
    loadChildren: () =>
      import('./features/owner/owner.routes').then((m) => m.OWNER_ROUTES),
  },

  // 🔹 TECHNICIAN AREA
  {
    path: 'technician',
    canActivate: [AuthGuard, TechnicianGuard, StorageGuard],
    loadChildren: () =>
      import('./features/technician/technician.routes').then((m) => m.TECHNICIAN_ROUTES),
  },

  // 🔹 FALLBACK
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
