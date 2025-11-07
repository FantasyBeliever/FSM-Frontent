import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { SessionService } from '../../../core/services/auth/session.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  errorMsg = '';

  constructor(
    private auth: AuthService,
    private session: SessionService,
    private router: Router
  ) {}

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMsg = 'Please enter both fields.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.user) this.session.setUser(res.user);
        this.router.navigate(['/auth/role-select']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = 'Invalid credentials.';
        console.error('[LoginComponent] login error:', err);
      }
    });
  }
}
