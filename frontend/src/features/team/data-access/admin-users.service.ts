import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Role, UserStatus } from '@core/models';

export interface AdminUserResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: UserStatus;
  profile_picture_path?: string | null;
  is_email_verified?: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  roles?: Role[];
}

export interface CreateAdminUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status?: UserStatus;     
  roleNames?: string[];    
}

export interface UpdateAdminUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  roleNames?: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  constructor(private http: HttpClient) {}

  list(): Observable<AdminUserResponse[]> {
    return this.http.get<AdminUserResponse[]>(this.apiUrl);
  }

  create(payload: CreateAdminUserRequest): Observable<AdminUserResponse> {
    return this.http.post<AdminUserResponse>(this.apiUrl, payload);
  }

  update(id: string, payload: UpdateAdminUserRequest): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.apiUrl}/${id}`, payload);
  }

  deactivate(id: string): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }
}
