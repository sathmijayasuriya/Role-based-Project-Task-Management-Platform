import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '@core/services/auth.service';
import { NotificationsMenuComponent } from '@features/notifications/ui/notifications-menu/notifications-menu.component';
import { NotificationsService } from '@features/notifications/data-access/notifications.service';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  roles?: string[];
  permissions?: string[];
   hideForRoles?: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    NotificationsMenuComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  sidebarCollapsed = signal(false);
  currentPage = signal('Dashboard');

  menuItems: MenuItem[] = [
    { icon: 'admin_panel_settings', label: 'Admin', route: '/admin/dashboard', roles: ['admin'] },
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', hideForRoles: ['admin'] },
    { icon: 'notifications', label: 'Notifications', route: '/notifications' },
    { icon: 'folder', label: 'All Projects', route: '/projects' },
    { icon: 'task', label: 'Tasks', route: '/tasks' },
    { icon: 'people', label: 'Team', route: '/team', roles: ['admin'] },
  ];

  settingsItems: MenuItem[] = [
    { icon: 'person', label: 'My Profile', route: '/profile' },
    {
      icon: 'lock',
      label: 'Roles & Permissions',
      route: '/admin/roles',
      roles: ['admin'],
      permissions: ['MANAGE_ROLES', 'MANAGE_PERMISSIONS'],
    },
  ];

  favoriteProjects = [
    { id: 1, name: 'Primor Project', color: '#895834ff' },
    { id: 2, name: 'Sullivan Project', color: '#0d1d36ff' },
  ];

  constructor(
    public authService: AuthService,
    private readonly notifications: NotificationsService,
  ) {}

  ngOnInit(): void {
    // ensure sidebar shows the latest unread count immediately
    this.notifications.refreshUnreadCount().subscribe({ error: () => {} });
  }

  notificationsUnread() {
    return this.notifications.unreadCount();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  getInitials(): string {
    const user = this.authService.currentUser();
    if (!user || !user.firstName || !user.lastName) return 'U';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  hasRole(roles: string[]): boolean {
    return roles.some((role) => this.authService.hasRole(role));
  }

  hasPermission(perms: string[]): boolean {
    return perms.some((perm) => this.authService.hasPermission(perm));
  }

  canShow(item: MenuItem): boolean {
    if (item.hideForRoles && item.hideForRoles.some((role) => this.authService.hasRole(role))) {
      return false;
    }
    const roleOk = !item.roles || this.hasRole(item.roles);
    const permOk = !item.permissions || this.hasPermission(item.permissions);
    if (item.roles && item.permissions) {
      // show if user matches either roles or permissions when both are provided
      return roleOk || permOk;
    }
    return roleOk && permOk;
  }

  logout(): void {
    this.authService.logout();
  }
}
