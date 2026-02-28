import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../../data-access/notifications.service';
import { AppNotification } from '@core/models';

@Component({
  selector: 'app-notifications-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  templateUrl: './notifications-menu.component.html',
  styleUrl: './notifications-menu.component.scss',
})
export class NotificationsMenuComponent implements OnInit, OnDestroy {
  private readonly notificationsApi = inject(NotificationsService);
  private readonly subs: Subscription[] = [];
  private readonly now = signal(Date.now());
  private nowIntervalId: ReturnType<typeof setInterval> | null = null;

  notifications = computed(() => this.notificationsApi.notifications());
  unreadCount = computed(() => this.notificationsApi.unreadCount());
  loading = computed(() => this.notificationsApi.loading());

  ngOnInit(): void {
    this.nowIntervalId = window.setInterval(
      () => this.now.set(Date.now()),
      60_000,
    );
    this.subs.push(
      this.notificationsApi
        .fetch({ page: 1, pageSize: 10, includeRead: true })
        .subscribe({ error: () => {} }),
    );
    this.subs.push(
      this.notificationsApi.refreshUnreadCount().subscribe({ error: () => {} }),
    );
    this.notificationsApi.connectStream();
  }

  ngOnDestroy(): void {
    if (this.nowIntervalId !== null) {
      clearInterval(this.nowIntervalId);
      this.nowIntervalId = null;
    }
    this.notificationsApi.disconnectStream();
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  markAsRead(notification: AppNotification): void {
    if (!notification?.id || notification.isRead) return;
    this.notificationsApi.markAsRead(notification.id).subscribe({
      error: () => {},
    });
  }

  markAll(): void {
    if (this.unreadCount() === 0) return;
    this.notificationsApi.markAllAsRead().subscribe({ error: () => {} });
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
