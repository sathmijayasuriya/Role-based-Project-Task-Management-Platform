import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from '@core/services/auth.service';
import { AppNotification, NotificationType } from '@core/models';

interface NotificationListResponse {
  items: any[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

//user runtime state + SSE
@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  loading = signal(false);
  meta = signal<NotificationListResponse['meta'] | null>(null);

  private eventSource?: EventSource;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient, private auth: AuthService) {}

  // Fetch notifications (paginated REST API)
  fetch(params?: {
    page?: number;
    pageSize?: number;
    includeRead?: boolean;
  }): Observable<AppNotification[]> {
    const httpParams = new HttpParams({
      fromObject: {
        page: String(params?.page ?? 1),
        pageSize: String(params?.pageSize ?? 10),
        includeRead: String(params?.includeRead ?? true),
      },
    });

    this.loading.set(true);

    return this.http
      .get<NotificationListResponse>(this.API_URL, { params: httpParams })
      .pipe(
        map((response) => {
          const items = (response.items ?? []).map((item) =>
            this.normalize(item),
          );
          this.notifications.set(items);
          this.updateUnreadCountFrom(items);
          this.meta.set(response.meta ?? null);
          return items;
        }),
      tap((items) => {
      console.log('[NotificationsService] fetch() returned:', items);
      }),
        tap({
          next: () => this.loading.set(false),
          error: () => this.loading.set(false),
        }),
      );
  }

  refreshUnreadCount(): Observable<{ count: number }> {
    return this.http
      .get<{ count: number }>(`${this.API_URL}/unread-count`)
      .pipe(
        tap((res) => {
          if (typeof res?.count === 'number') {
            this.unreadCount.set(res.count);
          }
        }),
      );
  }

  markAsRead(id: string): Observable<AppNotification> {
    return this.http.patch<any>(`${this.API_URL}/${id}/read`, {}).pipe(
      map((payload) => this.normalize(payload)),
      tap((notification) => {
        this.replace(notification);
        this.unreadCount.update((count) =>
          notification.isRead ? Math.max(0, count - 1) : count,
        );
      }),
    );
  }

  markAllAsRead(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.API_URL}/mark-all-read`,
      {},
    ).pipe(
      tap(() => {
        this.notifications.update((items) =>
          items.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt ?? new Date(),
          })),
        );
        this.unreadCount.set(0);
      }),
    );
  }

  // Receive real-time notifications via SSE (EventSource)
  connectStream(): void {
    const token = this.auth.getToken();
    if (!token || typeof window === 'undefined') return;

    this.disconnectStream();

    const url = `${this.API_URL}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const notification = this.normalize(raw);
        this.prepend(notification);
      } catch (error) {
        console.warn('Failed to parse notification stream payload', error);
      }
    };

    es.onerror = () => {
      this.disconnectStream();
      this.reconnectTimer = setTimeout(() => this.connectStream(), 5000);
    };

    this.eventSource = es;
  }

  disconnectStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  // ---------- helpers ----------

  private prepend(notification: AppNotification) {
    this.notifications.update((items) => {
      const filtered = items.filter((item) => item.id !== notification.id);
      return [notification, ...filtered].slice(0, 25);
    });

    if (!notification.isRead) {
      this.unreadCount.update((count) => count + 1);
    }
  }

  private replace(notification: AppNotification) {
    this.notifications.update((items) => {
      const exists = items.some((item) => item.id === notification.id);
      if (!exists) {
        return [notification, ...items].slice(0, 25);
      }
      return items.map((item) =>
        item.id === notification.id ? notification : item,
      );
    });
  }

  private updateUnreadCountFrom(list: AppNotification[]) {
    const count = list.filter((item) => !item.isRead).length;
    this.unreadCount.set(count);
  }

  private normalize(payload: any): AppNotification {
    return {
      id: payload.id,
      userId: payload.user_id ?? null,
      audience: (payload.audience as 'user' | 'admin') ?? 'user',
      title: payload.title,
      message: payload.message,
      type: (payload.type as NotificationType) ?? 'info',
      entityType: payload.entity_type ?? null,
      entityId: payload.entity_id ?? null,
      activityLogId: payload.activity_log_id ?? null,
      isRead: Boolean(payload.is_read),
      readAt: payload.read_at ? new Date(payload.read_at) : null,
      meta: payload.meta ?? null,
      createdAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    };
  }
}
