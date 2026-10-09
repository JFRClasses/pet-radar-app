import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { API_URL, ApiResponse, unwrap } from './api';

const TOKEN_KEY = 'petradar.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly token = this.tokenState.asReadonly();

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${API_URL}/auth/login`, { email, password })
      .pipe(
        map((response) => unwrap(response).token),
        tap((token) => {
          localStorage.setItem(TOKEN_KEY, token);
          this.tokenState.set(token);
        }),
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(null);
    this.router.navigateByUrl('/login');
  }

  isAuthenticated(): boolean {
    const token = this.tokenState();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
