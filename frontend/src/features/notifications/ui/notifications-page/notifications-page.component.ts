import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationsService } from '../../data-access/notifications.service';
import { AuthService } from '@core/services/auth.service';
import { AppNotification, NotificationType } from '@core/models';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
  ],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  private readonly notificationsApi = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly now = signal(Date.now());
  private nowIntervalId: ReturnType<typeof setInterval> | null = null;

  notifications = computed(() => this.notificationsApi.notifications());
  unreadCount = computed(() => this.notificationsApi.unreadCount());
  loading = computed(() => this.notificationsApi.loading());
  meta = computed(() => this.notificationsApi.meta());
  private readonly pageSize = 10;
  canCreate = computed(
    () => this.auth.isAdmin() || this.auth.hasPermission('MANAGE_NOTIFICATIONS'),
  );
  rangeStart = computed(() => {
    const meta = this.meta();
    if (!meta) return 0;
    return (meta.page - 1) * meta.pageSize + 1;
  });
  rangeEnd = computed(() => {
    const meta = this.meta();
    if (!meta) return 0;
    const end = meta.page * meta.pageSize;
    return meta.total ? Math.min(end, meta.total) : end;
  });

  ngOnInit(): void {
    this.nowIntervalId = window.setInterval(
      () => this.now.set(Date.now()),
      60_000,
    );
    this.loadPage(1);
    this.notificationsApi.refreshUnreadCount().subscribe({ error: () => {} });
    this.notificationsApi.connectStream();
  }

  ngOnDestroy(): void {
    if (this.nowIntervalId !== null) {
      clearInterval(this.nowIntervalId);
      this.nowIntervalId = null;
    }
  }

  trackById(_: number, item: AppNotification) {
    return item.id;
  }

  markAsRead(notification: AppNotification): void {
    if (!notification?.id || notification.isRead) return;
    this.notificationsApi.markAsRead(notification.id).subscribe({ error: () => {} });
  }

  markAll(): void {
    if (this.unreadCount() === 0) return;
    this.notificationsApi.markAllAsRead().subscribe({ error: () => {} });
  }

  loadPage(page: number): void {
    const meta = this.meta();
    if (page < 1) return;
    if (meta?.totalPages && page > meta.totalPages) return;
    this.notificationsApi
      .fetch({ page, pageSize: this.pageSize, includeRead: true })
      .subscribe({ error: () => {} });
  }

  nextPage(): void {
    const current = this.meta()?.page ?? 1;
    this.loadPage(current + 1);
  }

  prevPage(): void {
    const current = this.meta()?.page ?? 1;
    this.loadPage(current - 1);
  }

  iconFor(type: NotificationType): string {
    if (type === 'success') return 'check_circle';
    if (type === 'warning') return 'warning';
    if (type === 'error') return 'error';
    return 'info';
  }

  chipClass(type: NotificationType): string {
    return {
      success: 'chip success',
      warning: 'chip warning',
      error: 'chip error',
      info: 'chip info',
    }[type];
  }

  timeAgo(date: Date | null | undefined): string {
    if (!date) return 'just now';
    const diffMs = this.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }
}
