import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

export const APP_SHELL_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@features/dashboard/ui/user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('@features/notifications/ui/notifications-page/notifications-page.component').then(
        (m) => m.NotificationsPageComponent,
      ),
  },
  {
    path: 'projects',
    loadChildren: () => import('@features/projects/projects.routes').then((m) => m.default),
  },
  {
    path: 'tasks',
    loadChildren: () => import('@features/tasks/tasks.routes').then((m) => m.default),
  },
  {
    path: 'team',
    loadChildren: () => import('@features/team/team.routes').then((m) => m.default),
  },
  {
    path: 'profile',
    loadChildren: () => import('@features/profile/profile.routes').then((m) => m.default),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: ['admin'], permissions: ['MANAGE_ROLES', 'MANAGE_PERMISSIONS', 'MANAGE_NOTIFICATIONS'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/admin/ui/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'notifications/create',
        loadComponent: () =>
          import('@features/notifications/ui/notification-composer/notification-composer.component').then(
            (m) => m.NotificationComposerComponent,
          ),
      },
      {
        path: 'users',
        loadChildren: () => import('@features/admin/admin.routes').then((m) => m.default),
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('@features/admin/ui/roles-page/roles-page.component').then(
            (m) => m.RolesPageComponent
          ),
      },
      {
        path: 'roles/:id',
        loadComponent: () =>
          import('@features/admin/ui/roles-page/roles-page.component').then(
            (m) => m.RolesPageComponent
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
