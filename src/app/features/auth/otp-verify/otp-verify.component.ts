import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/notification/toast.service';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-verify.component.html',
  styleUrls: ['./otp-verify.component.scss']
})
export class OtpVerifyComponent {
  otp = '';
  loading = false;
  errorMsg = '';

  constructor(private router: Router, private toast: ToastService) {}

  onVerify(): void {
    if (this.otp.length < 4) {
      this.errorMsg = 'Please enter a valid OTP.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    // Mock verification logic
    setTimeout(() => {
      this.loading = false;
      if (this.otp === '1234') {
        this.toast.show('OTP verified successfully!', 'success');
        this.router.navigate(['/auth/role-select']);
      } else {
        this.errorMsg = 'Invalid OTP. Try again.';
        this.toast.show('Invalid OTP entered.', 'error');
      }
    }, 1000);
  }
}
