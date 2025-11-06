import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  constructor(private tokenService: TokenService, private router: Router) {}

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/auth/login']);
  }
}
