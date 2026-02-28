import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../../core/models';
import { transformUserResponse } from '../utils/transform.util';

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface UpdateProfilePictureRequest {
  profile_picture_url: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUser(): Observable<User> {
    return this.http.get<any>(`${this.API_URL}/users/me`).pipe(
      map((response) => transformUserResponse(response) as User)
    );
  }

  updateProfile(data: UpdateProfileRequest): Observable<User> {
    return this.http.patch<any>(`${this.API_URL}/users/me`, data).pipe(
      map((response) => transformUserResponse(response) as User)
    );
  }

  updateProfilePicture(data: UpdateProfilePictureRequest): Observable<User> {
    return this.http.patch<any>(`${this.API_URL}/users/me/profile-picture`, data).pipe(
      map((response) => transformUserResponse(response) as User)
    );
  }

  removeProfilePicture(): Observable<User> {
    return this.http.patch<any>(`${this.API_URL}/users/me/profile-picture`, {
      profile_picture_url: '',
    }).pipe(
      map((response) => transformUserResponse(response) as User)
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.API_URL}/auth/change-password`, data);
  }
}

