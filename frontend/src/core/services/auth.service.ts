import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { User, LoginRequest, LoginResponse } from '../models';
import { environment } from '@environments/environment';
import { transformUserResponse } from '@core/utils/user-transform.util';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;

  // Signals for reactive state management
  private _currentUser = signal<User | null>(null);
  private _isAuthenticated = signal<boolean>(false);
  private _isLoading = signal<boolean>(false);

  // Public read-only signals
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = this._isAuthenticated.asReadonly();
  isLoading = this._isLoading.asReadonly();

  // Computed signals
  userRoles = computed(() => this._currentUser()?.roles.map((r) => r.name) ?? []);
  isAdmin = computed(() =>
    this.userRoles().some((role) => role?.toLowerCase() === 'admin'),
  );
  userFullName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this._isLoading.set(true);
    return this.http.post<any>(`${this.API_URL}/auth/login`, credentials).pipe(
      map((response) => ({
        access_token: response.accessToken || response.access_token,
        user: this.normalizeUser(response.user),
      }) as LoginResponse),
      tap({
        next: (response) => {
          this.setSession(response);
          this._isLoading.set(false);
        },
        error: () => {
          this._isLoading.set(false);
        },
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  hasRole(roleName: string): boolean {
    const target = (roleName ?? '').trim().toLowerCase();
    if (!target) return false;
    return this.userRoles().some((role) => (role ?? '').trim().toLowerCase() === target);
  }

  hasPermission(permissionName: string): boolean {
    const user = this._currentUser();
    if (!user || !permissionName) {
      return false;
    }

    const normalized = permissionName.toUpperCase();
    if (user.permissions?.some((permission) => permission.toUpperCase() === normalized)) {
      return true;
    }

    return (
      user.roles?.some((role) =>
        role.permissions?.some((permission) => permission.name?.toUpperCase() === normalized),
      ) ?? false
    );
  }

  private normalizeUser(payload: any): User {
    const normalized = transformUserResponse(payload);
    if (!normalized) {
      throw new Error('Invalid user payload');
    }
    return normalized;
  }

  private setSession(authResult: LoginResponse): void {
    const normalized = this.normalizeUser(authResult.user);
    localStorage.setItem('access_token', authResult.access_token);
    localStorage.setItem('user', JSON.stringify(normalized));
    this._currentUser.set(normalized);
    this._isAuthenticated.set(true);
  }

  private loadUserFromStorage(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const parsed = JSON.parse(userStr);
        const normalized = this.normalizeUser(parsed);
        this._currentUser.set(normalized);
        this._isAuthenticated.set(true);
      } catch (error) {
        this.logout();
      }
    }
  }

  refreshUserData(): Observable<User> {
    return this.http.get<any>(`${this.API_URL}/users/me`).pipe(
      map((response) => this.normalizeUser(response)),
      tap((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        this._currentUser.set(user);
      })
    );
  }
}
