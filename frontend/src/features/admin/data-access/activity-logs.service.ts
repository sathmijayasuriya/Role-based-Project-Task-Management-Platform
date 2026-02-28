import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface ActivityLogUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  meta?: Record<string, any> | null;
  user_id?: string | null;
  user?: ActivityLogUser | null;
  created_at: string;
}

export interface ActivityLogResponse {
  items: ActivityLog[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    sort: 'ASC' | 'DESC';
  };
}

export interface ActivityLogQuery {
  page?: number;
  pageSize?: number;
  userId?: string;
  entityType?: string;
  action?: string;
  sort?: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class ActivityLogsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/activity-logs`;

  constructor(private http: HttpClient) {}

  getActivityLogs(query: ActivityLogQuery = {}): Observable<ActivityLogResponse> {
    let params = new HttpParams();

    if (query.page) params = params.set('page', String(query.page));
    if (query.pageSize) params = params.set('pageSize', String(query.pageSize));
    if (query.userId) params = params.set('userId', query.userId);
    if (query.entityType) params = params.set('entityType', query.entityType);
    if (query.action) params = params.set('action', query.action);
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<ActivityLogResponse>(this.apiUrl, { params });
  }
}
