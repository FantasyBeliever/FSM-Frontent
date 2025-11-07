import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserSession, SessionService } from '../../../core/services/auth/session.service';


@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-select.component.html',
  styleUrls: ['./role-select.component.scss']
})
export class RoleSelectComponent {
  user: UserSession | null = null;

  constructor(private session: SessionService, private router: Router) {
    this.user = this.session.getUser();
  }

  selectRole(role: 'owner' | 'technician'): void {
    const user = this.user;
    if (!user) {
      alert('Session expired. Please log in again.');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Update the user role and persist it
    const updated = { ...user, role };
    this.session.setUser(updated);

    // Navigate to respective dashboard
    if (role === 'owner') {
      this.router.navigate(['/owner/dashboard']);
    } else {
      this.router.navigate(['/technician/tech-dashboard']);
    }
  }
}
