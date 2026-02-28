import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { NotificationType } from '@core/models';

export interface AdminNotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  audience?: 'user' | 'admin';
  roleIds: string[];
  roleNames?: string[];
  entityType?: string | null;
  entityId?: string | null;
}

export interface AdminNotificationResponse {
  created: number;
  targets: string[];
}

//admin actions (create/broadcast/manage)
@Injectable({
  providedIn: 'root',
})
export class AdminNotificationsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/notifications`;

  constructor(private http: HttpClient) {}

  create(payload: AdminNotificationPayload): Observable<AdminNotificationResponse> {
    console.log("requested data,")
    return this.http.post<AdminNotificationResponse>(this.apiUrl, payload);
  }
}
